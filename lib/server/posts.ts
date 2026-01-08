import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isAdminDb, getCurrentUser } from "@/lib/server/admin";
import type { Post, PostType, Comment } from "@/lib/types";

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
            type: p.type,
            visibility: p.visibility,
            title: p.title,
            content: "",
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

    return (posts ?? []).map((p) => ({
        id: p.id,
        slug: p.slug,
        type: p.type,
        visibility: p.visibility,
        title: p.title,
        content: p.content,
        categorySlug: p.category_slug,
        createdAt: p.created_at,
        updatedAt: p.updated_at ?? p.created_at,
        imageKeys: p.image_keys ?? [],
        thumbnailImageKey: p.thumbnail_image_key,
    }));
}

export async function getPostBySlugDirectly(params: {
    slug: string;
    user?: { id: string; email?: string | null } | null;
}): Promise<Post> {
    const isAdmin = await isAdminDb(params.user);
    const supabase = await createSupabaseServerClient();

    const { data: post, error } = await supabase
        .from("posts")
        .select("*")
        .eq("slug", params.slug)
        .maybeSingle();

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

    return {
        id: post.id,
        slug: post.slug,
        type: post.type,
        visibility: post.visibility,
        title: post.title,
        content: post.content,
        categorySlug: post.category_slug,
        createdAt: post.created_at,
        updatedAt: post.updated_at ?? post.created_at,
        imageKeys: post.image_keys ?? [],
        thumbnailImageKey: post.thumbnail_image_key,
        viewCount: post.view_count,
    };
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
