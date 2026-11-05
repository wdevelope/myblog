"use server";

import { z } from "zod";
import { assertAdmin, getViewer } from "@/lib/server/admin";
import { getCommentedPosts, listAvatarPaths, revalidateCommentedPosts } from "@/lib/server/account";
import { dbFailure } from "@/lib/server/dbFailure";
import { revalidateGuestbook } from "@/lib/server/guestbook";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { NICKNAME_MESSAGES, nicknameProblem } from "@/lib/nickname";
import { AVATAR_BUCKET, isOwnAvatarPath } from "@/lib/avatar";

export type ProfileResult = { success: true } | { success: false; error: string };

const ADMIN_PROFILE_FIXED = "관리자는 Owen과 로고로 고정이에요.";

const nicknameSchema = z
  .string()
  .trim()
  .superRefine((name, ctx) => {
    const problem = nicknameProblem(name);
    if (problem) ctx.addIssue({ code: "custom", message: NICKNAME_MESSAGES[problem] });
  });

// 이름·사진은 그 사람이 댓글을 단 정적 글과 방명록에 들어 있다. 저장은 이미 끝났으므로 무효화를 위한 조회가 실패해도
// 실패로 돌려주지 않는다(그 글들은 ISR 주기 안에 다시 만들어진다).
async function refreshCommentedPosts(userId: string) {
  // 방명록은 한 쪽뿐이라 쓴 글이 있는지 읽지 않고 늘 다시 만든다.
  revalidateGuestbook();
  try {
    revalidateCommentedPosts(await getCommentedPosts(userId));
  } catch {}
}

export async function updateNickname(input: unknown): Promise<ProfileResult> {
  const { user, isAdmin } = await getViewer();
  if (!user) {
    return { success: false, error: "unauthorized" };
  }
  if (isAdmin) {
    return { success: false, error: ADMIN_PROFILE_FIXED };
  }

  const parsed = nicknameSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? NICKNAME_MESSAGES.invalid };
  }

  // 규칙·중복은 DB 제약이 최종 판정한다. 중복확인과 저장 사이에 다른 사람이 먼저 쓰면 unique 위반이 온다.
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ nickname: parsed.data })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") return { success: false, error: NICKNAME_MESSAGES.taken };
    if (error.code === "23514") return { success: false, error: NICKNAME_MESSAGES.invalid };
    return dbFailure("닉네임 저장", error);
  }

  await refreshCommentedPosts(user.id);
  return { success: true };
}

// 브라우저가 본인 폴더에 새 이름으로 올린 뒤 그 경로를 넘긴다. 경로 모양과 파일이 실제로 있는지 보고 저장한다.
export async function updateAvatar(path: unknown): Promise<ProfileResult> {
  const { user, isAdmin } = await getViewer();
  if (!user) {
    return { success: false, error: "unauthorized" };
  }
  if (isAdmin) {
    return { success: false, error: ADMIN_PROFILE_FIXED };
  }

  const parsed = z.string().safeParse(path);
  if (!parsed.success || !isOwnAvatarPath(user.id, parsed.data)) {
    return { success: false, error: "잘못된 사진 경로예요." };
  }

  const supabase = await createSupabaseServerClient();
  let paths: string[];
  try {
    paths = await listAvatarPaths(supabase, user.id);
  } catch (e) {
    return dbFailure("프로필 사진 목록 조회", e as Error);
  }
  if (!paths.includes(parsed.data)) {
    return { success: false, error: "올린 사진을 찾지 못했어요. 다시 올려 주세요." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_path: parsed.data })
    .eq("id", user.id);
  if (error) return dbFailure("프로필 사진 저장", error);

  // 이전 사진(과 저장하지 못하고 남은 파일)을 지운다. 실패해도 사진 바꾸기는 끝났다.
  const stale = paths.filter((p) => p !== parsed.data);
  if (stale.length) await supabase.storage.from(AVATAR_BUCKET).remove(stale);

  await refreshCommentedPosts(user.id);
  return { success: true };
}

export async function removeAvatar(): Promise<ProfileResult> {
  const { user, isAdmin } = await getViewer();
  if (!user) {
    return { success: false, error: "unauthorized" };
  }
  if (isAdmin) {
    return { success: false, error: ADMIN_PROFILE_FIXED };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_path: null })
    .eq("id", user.id);
  if (error) return dbFailure("프로필 사진 삭제", error);

  try {
    const paths = await listAvatarPaths(supabase, user.id);
    if (paths.length) await supabase.storage.from(AVATAR_BUCKET).remove(paths);
  } catch {
    // 경로는 이미 비웠다. 남은 파일은 본인 폴더에만 있고 다음에 올릴 때 지운다.
  }

  await refreshCommentedPosts(user.id);
  return { success: true };
}

// 부적절한 닉네임·사진을 관리자가 댓글에서 바로 내린다(18절 결정 3). 남의 행·폴더라 관리자 판정 뒤 service role로 고친다.
export async function resetUserProfile(userId: unknown): Promise<ProfileResult> {
  if (!(await assertAdmin())) {
    return { success: false, error: "forbidden" };
  }
  const parsed = z.uuid().safeParse(userId);
  if (!parsed.success) {
    return { success: false, error: "잘못된 사용자예요." };
  }

  const service = createSupabaseServiceClient();
  const { error } = await service
    .from("profiles")
    .update({ nickname: null, avatar_path: null })
    .eq("id", parsed.data);
  if (error) return dbFailure("프로필 초기화", error);

  try {
    const paths = await listAvatarPaths(service, parsed.data);
    if (paths.length) await service.storage.from(AVATAR_BUCKET).remove(paths);
  } catch {
    // 경로는 이미 비워 화면에는 나오지 않는다.
  }

  await refreshCommentedPosts(parsed.data);
  return { success: true };
}
