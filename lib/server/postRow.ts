import type { Post, PostType, Visibility } from "@/lib/types";

// 쿠키를 읽는 posts.ts와 쿠키 없이 캐시하는 publicPosts.ts가 함께 쓰므로 어느 쪽에도 두지 않는다.
export type PostRow = {
    id: string;
    slug: string;
    type: PostType;
    visibility: Visibility;
    title: string;
    content: string;
    category_slug: string | null;
    created_at: string;
    updated_at: string | null;
    image_keys: string[] | null;
    thumbnail_image_key: string | null;
    view_count?: number;
    comments?: { count: number }[];
};

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
        updatedAt: row.updated_at ?? row.created_at,
        imageKeys: row.image_keys ?? [],
        thumbnailImageKey: row.thumbnail_image_key,
        viewCount: row.view_count,
        commentCount: row.comments?.[0]?.count ?? 0,
    };
}
