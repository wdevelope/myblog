import type { TableRow } from "@/lib/supabase/database";
import type { Post } from "@/lib/types";

// 쿠키를 읽는 posts.ts와 쿠키 없이 캐시하는 publicPosts.ts가 함께 쓰므로 어느 쪽에도 두지 않는다.
export type PostRow = Omit<TableRow<"posts">, "author_id"> & { comments?: { count: number }[] };

export function mapPost(row: PostRow): Post {
    return {
        id: row.id,
        slug: row.slug,
        type: row.type,
        visibility: row.visibility,
        title: row.title,
        content: row.content,
        categorySlug: row.category_slug,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        imageKeys: row.image_keys ?? [],
        thumbnailImageKey: row.thumbnail_image_key,
        viewCount: row.view_count,
        commentCount: row.comments?.[0]?.count ?? 0,
    };
}
