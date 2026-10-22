import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MyComment } from "@/lib/types";

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
