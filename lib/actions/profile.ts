"use server";

import { getViewer } from "@/lib/server/admin";
import { getCommentedPosts, revalidateCommentedPosts } from "@/lib/server/account";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NICKNAME_MESSAGES, nicknameSchema } from "@/lib/nickname";

export type ProfileResult = { success: true } | { success: false; error: string };

const ADMIN_PROFILE_FIXED = "관리자는 Owen과 로고로 고정이에요.";

// 이름·사진은 그 사람이 댓글을 단 정적 글에 들어 있다. 저장은 이미 끝났으므로 무효화를 위한 조회가 실패해도
// 실패로 돌려주지 않는다(그 글들은 ISR 주기 안에 다시 만들어진다).
async function refreshCommentedPosts(userId: string) {
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
    return { success: false, error: `DB Error: ${error.message}` };
  }

  await refreshCommentedPosts(user.id);
  return { success: true };
}
