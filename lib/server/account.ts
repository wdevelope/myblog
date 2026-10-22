import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePublicPosts } from "@/lib/server/publicPosts";
import type { MyComment, PostType } from "@/lib/types";

// 댓글 목록은 정적 HTML이라 작성자가 탈퇴하거나 이름·사진을 바꾸면 그 사람이 댓글을 단 글을 다시 만들어야 한다.
// 탈퇴는 댓글이 cascade로 지워지므로 지우기 전에 읽어 둔다.
export async function getCommentedPosts(userId: string): Promise<Map<PostType, string[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("comments")
    .select("posts(slug,type)")
    .eq("author_id", userId);

  if (error) throw new Error(`DB Error: ${error.message}`);

  const slugsByType = new Map<PostType, string[]>();
  for (const comment of data ?? []) {
    // Database 타입이 없어(6단계) 다대일 관계도 배열로 추론되므로 두 모양을 모두 받는다.
    const post = Array.isArray(comment.posts) ? comment.posts[0] : comment.posts;
    if (!post) continue;
    slugsByType.set(post.type, [...(slugsByType.get(post.type) ?? []), post.slug]);
  }
  return slugsByType;
}

// revalidatePublicPosts가 updateTag를 쓰므로 서버 액션에서만 부른다.
export function revalidateCommentedPosts(slugsByType: Map<PostType, string[]>) {
  for (const [type, slugs] of slugsByType) {
    revalidatePublicPosts({ type, slugs });
  }
}

// 마이페이지용. RLS 클라이언트라 지금 볼 수 있는 글(공개 글, 관리자는 전부)에 단 댓글만 나온다.
export async function getMyComments(userId: string): Promise<MyComment[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("comments")
    .select("id,content,created_at,parent_id,posts(slug,type,title)")
    .eq("author_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`DB Error: ${error.message}`);

  return (data ?? []).map((row) => {
    // Database 타입이 없어(6단계) 다대일 관계도 배열로 추론되므로 두 모양을 모두 받는다.
    const post = Array.isArray(row.posts) ? row.posts[0] : row.posts;
    return {
      id: row.id,
      content: row.content,
      createdAt: row.created_at,
      isReply: Boolean(row.parent_id),
      post: post ?? null,
    };
  });
}
