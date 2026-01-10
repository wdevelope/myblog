import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isAdminDb, getCurrentUser } from "@/lib/server/admin";
import type { Post, PostType, Comment, Visibility } from "@/lib/types";

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
    };
}

export async function getPostsDirectly(params: {
    type: PostType;
    category?: string;
    user?: { id: string; email?: string | null } | null;
    limit?: number;
    offset?: number;
}): Promise<Post[]> {
    const isAdmin = await isAdminDb(params.user);
    const supabase = await createSupabaseServerClient();

    if (params.type === "diary" && !isAdmin) {
        // [SECURITY] 비공개 다이어리의 제목을 목록에 노출하기 위해 서비스 클라이언트를 사용합니다.
        // 상세 내용(content)은 절대 노출되면 안 되므로 여기서 반드시 빈 문자열로 초기화해야 합니다.
        // 이 로직을 수정할 때 content 필드가 포함되지 않도록 주의하십시오.
        const service = createSupabaseServiceClient();
        const { data: posts, error } = await service
            .from("posts")
            .select("id,slug,type,visibility,title,created_at,updated_at,thumbnail_image_key")
            .eq("type", "diary")
            .order("created_at", { ascending: false });

        if (error) throw new Error(`DB Error: ${error.message}`);

        return (posts ?? []).map((p) => ({
            id: p.id,
            slug: p.slug,
            type: p.type as PostType,
            visibility: p.visibility as Visibility,
            title: p.title,
            content: "", // 🔒 보안: 본문은 절대 클라이언트로 전송하지 않음
            categorySlug: null,
            createdAt: p.created_at,
            updatedAt: p.updated_at ?? p.created_at,
            imageKeys: [],
            thumbnailImageKey: p.thumbnail_image_key,
        }));
    }

    let query = supabase
        .from("posts")
        .select("*")
        .eq("type", params.type)
        .order("created_at", { ascending: false });

    if (params.category) query = query.eq("category_slug", params.category);
    if (!isAdmin) query = query.eq("visibility", "public");

    if (params.limit) query = query.limit(params.limit);
    if (params.offset) query = query.range(params.offset, params.offset + (params.limit ?? 10) - 1);

    const { data: posts, error } = await query;
    if (error) throw new Error(`DB Error: ${error.message}`);

    return (posts ?? []).map((p) => mapPost(p as PostRow));
}

export async function getPostBySlugDirectly(params: {
    slug: string;
    user?: { id: string; email?: string | null } | null;
}): Promise<Post> {
    const isAdmin = await isAdminDb(params.user);
    const supabase = await createSupabaseServerClient();

    let query = supabase
        .from("posts")
        .select("*")
        .eq("slug", params.slug);

    if (!isAdmin) {
        query = query.eq("visibility", "public");
    }

    const { data: post, error } = await query.maybeSingle();

    if (error) throw new Error(`DB Error: ${error.message}`);
    if (!post) {
        const error = new Error("Not Found") as Error & { status?: number };
        error.status = 404;
        throw error;
    }

    if (post.visibility === "private" && !isAdmin) {
        const error = new Error("Forbidden") as Error & { status?: number };
        error.status = 403;
        throw error;
    }

    return mapPost(post as PostRow);
}

export async function getCommentsDirectly(params: {
    postId: string;
    user?: { id: string; email?: string | null } | null;
}): Promise<Comment[]> {
    const isAdmin = await isAdminDb(params.user);
    const supabase = await createSupabaseServerClient();

    const { data: post, error: postError } = await supabase
        .from("posts")
        .select("id,type,visibility")
        .eq("id", params.postId)
        .maybeSingle();

    if (postError) throw new Error(`DB Error: ${postError.message}`);
    if (!post) throw new Error("Post not found");
    if (post.type === "diary") return [];
    if (post.visibility === "private" && !isAdmin) return [];

    const { data: comments, error } = await supabase
        .from("comments")
        .select("id,post_id,parent_id,author_id,content,created_at")
        .eq("post_id", params.postId)
        .order("created_at", { ascending: true });

    if (error) throw new Error(`DB Error: ${error.message}`);

    return (comments ?? []).map((c) => ({
        id: c.id,
        postId: c.post_id,
        parentId: c.parent_id,
        authorId: c.author_id,
        content: c.content,
        createdAt: c.created_at,
    }));
}
