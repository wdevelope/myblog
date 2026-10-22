"use server";

import { getViewer } from "@/lib/server/admin";
import { getCommentedPosts, revalidateCommentedPosts } from "@/lib/server/account";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

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

  const { error } = await createSupabaseServiceClient().auth.admin.deleteUser(user.id);
  if (error) {
    return { success: false, error: "탈퇴에 실패했어요." };
  }

  revalidateCommentedPosts(commentedPosts);

  return { success: true };
}
