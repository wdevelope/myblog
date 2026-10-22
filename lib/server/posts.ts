import "server-only";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getViewer, requireAdmin } from "@/lib/server/admin";
import { mapPost, type PostRow } from "@/lib/server/postRow";
import { postHref } from "@/lib/constants";
import type { Post, PostType, Comment } from "@/lib/types";

export async function getPostsDirectly(params: { type: PostType }): Promise<Post[]> {
    const { isAdmin } = await getViewer();
    const supabase = await createSupabaseServerClient();

    let query = supabase
        .from("posts")
        .select("*, comments(count)")
        .eq("type", params.type)
        .order("created_at", { ascending: false });

    if (!isAdmin) query = query.eq("visibility", "public");

    const { data: posts, error } = await query;
    if (error) throw new Error(`DB Error: ${error.message}`);

    return (posts ?? []).map((p) => mapPost(p as PostRow));
}

// 없는 글, 경로와 타입이 다른 글, 볼 권한이 없는 글은 모두 null이다. 호출부는 notFound()로 끝낸다.
export async function getPostForRoute(type: PostType, slug: string): Promise<Post | null> {
    const { isAdmin } = await getViewer();
    const supabase = await createSupabaseServerClient();

    let query = supabase
        .from("posts")
        .select("*, comments(count)")
        .eq("slug", slug)
        .eq("type", type);

    if (!isAdmin) query = query.eq("visibility", "public");

    const { data: post, error } = await query.maybeSingle();
    if (error) throw new Error(`DB Error: ${error.message}`);

    return post ? mapPost(post as PostRow) : null;
}

export async function loadPostForEdit(type: PostType, slug: string): Promise<Post> {
    // 로그인 뒤 목록이 아니라 이 수정 화면으로 돌아오게 한다.
    await requireAdmin(`${postHref(type)}/edit/${slug}`);
    const post = await getPostForRoute(type, slug);
    if (!post) notFound();
    return post;
}

// 호출부가 getPostForRoute로 이미 읽은 글을 넘긴다. 글을 다시 읽으면 상세마다 DB 왕복이 하나 더 생긴다.
export async function getCommentsDirectly(post: Pick<Post, "id" | "type" | "visibility">): Promise<Comment[]> {
    const { isAdmin } = await getViewer();
    if (post.type === "diary") return [];
    if (post.visibility === "private" && !isAdmin) return [];

    const supabase = await createSupabaseServerClient();
    const { data: comments, error } = await supabase
        .from("comments")
        .select("id,post_id,parent_id,author_id,author_is_admin,content,created_at")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });

    if (error) throw new Error(`DB Error: ${error.message}`);

    return (comments ?? []).map((c) => ({
        id: c.id,
        postId: c.post_id,
        parentId: c.parent_id,
        authorId: c.author_id,
        authorIsAdmin: c.author_is_admin,
        content: c.content,
        createdAt: c.created_at,
    }));
}
