"use server";

import { getViewer } from "@/lib/server/admin";
import { getCommentedPosts, listAvatarPaths, revalidateCommentedPosts } from "@/lib/server/account";
import { revalidateGuestbook } from "@/lib/server/guestbook";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { AVATAR_BUCKET } from "@/lib/avatar";

export type DeleteAccountResult =
  | { success: true }
  | { success: false; error: string };

// 지울 계정은 세션으로 확인한 본인뿐이라 입력을 받지 않는다. 계정 삭제는 Auth Admin API라 service role이 필요하다.
export async function deleteAccount(): Promise<DeleteAccountResult> {
  const { user, isAdmin } = await getViewer();
  if (!user) {
    return { success: false, error: "unauthorized" };
  }
  // 관리 계정을 잃지 않게 관리자는 탈퇴하지 않는다.
  if (isAdmin) {
    return { success: false, error: "관리자 계정은 탈퇴할 수 없어요." };
  }

  let commentedPosts;
  try {
    commentedPosts = await getCommentedPosts(user.id);
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "DB Error" };
  }

  const service = createSupabaseServiceClient();
  const { error } = await service.auth.admin.deleteUser(user.id);
  if (error) {
    return { success: false, error: "탈퇴에 실패했어요." };
  }

  // Storage 파일은 계정과 함께 지워지지 않는다. 계정을 지운 뒤에 지워야, 탈퇴가 실패했을 때 사진만 사라지지 않는다.
  // 실패해도 탈퇴는 끝났다(남은 파일은 어느 화면에서도 가리키지 않는다).
  try {
    const paths = await listAvatarPaths(service, user.id);
    if (paths.length) await service.storage.from(AVATAR_BUCKET).remove(paths);
  } catch {}

  revalidateCommentedPosts(commentedPosts);
  // 방명록 글은 계정과 함께 cascade로 지워진다. 한 쪽뿐이라 쓴 글이 있는지 읽지 않고 다시 만든다.
  revalidateGuestbook();

  return { success: true };
}
