"use server";

import { getViewer } from "@/lib/server/admin";
import { revalidatePublicPosts } from "@/lib/server/publicPosts";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { PostType } from "@/lib/types";

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

  // 댓글은 계정과 함께 cascade로 지워진다. 그 글들의 공개 캐시를 무효화하려면 지우기 전에 읽어 둬야 한다.
  const supabase = await createSupabaseServerClient();
  const { data: comments, error: commentsError } = await supabase
    .from("comments")
    .select("posts(slug,type)")
    .eq("author_id", user.id);

  if (commentsError) {
    return { success: false, error: `DB Error: ${commentsError.message}` };
  }

  const { error } = await createSupabaseServiceClient().auth.admin.deleteUser(user.id);
  if (error) {
    return { success: false, error: "탈퇴에 실패했어요." };
  }

  const slugsByType = new Map<PostType, string[]>();
  for (const comment of comments ?? []) {
    // Database 타입이 없어(6단계) 다대일 관계도 배열로 추론되므로 두 모양을 모두 받는다.
    const post = Array.isArray(comment.posts) ? comment.posts[0] : comment.posts;
    if (!post) continue;
    slugsByType.set(post.type, [...(slugsByType.get(post.type) ?? []), post.slug]);
  }
  for (const [type, slugs] of slugsByType) {
    revalidatePublicPosts({ type, slugs });
  }

  return { success: true };
}
