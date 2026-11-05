import type { TableRow } from "@/lib/supabase/database";
import type { Comment } from "@/lib/types";

// 공개 캐시 조회, 관리자 조회, 댓글 쓰기가 같은 열을 읽어 같은 모양으로 돌려준다.
export const COMMENT_COLUMNS =
  "id,post_id,parent_id,author_id,author_is_admin,content,created_at,author:profiles(nickname,avatar_path)";

export type CommentRow = TableRow<"comments"> & {
  author: Pick<TableRow<"profiles">, "nickname" | "avatar_path"> | null;
};

export function mapComment(row: CommentRow): Comment {
  return {
    id: row.id,
    postId: row.post_id,
    parentId: row.parent_id,
    authorId: row.author_id,
    authorIsAdmin: row.author_is_admin,
    authorNickname: row.author?.nickname ?? null,
    authorAvatarPath: row.author?.avatar_path ?? null,
    content: row.content,
    createdAt: row.created_at,
  };
}
