import "server-only";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getViewer, requireAdmin } from "@/lib/server/admin";
import { mapPost, type PostRow } from "@/lib/server/postRow";
import { postHref } from "@/lib/constants";
import type { Post, PostType, Comment } from "@/lib/types";

export async function getPostsDirectly(params: { type: PostType }): Promise<Post[]> {
    const { isAdmin } = await getViewer();
    const supabase = await createSupabaseServerClient();

    if (params.type === "diary" && !isAdmin) {
        // [SECURITY] 비공개 다이어리의 제목을 목록에 노출하기 위해 서비스 클라이언트를 사용합니다.
        // 상세 내용(content)은 절대 노출되면 안 되므로 여기서 반드시 빈 문자열로 초기화해야 합니다.
        // 이 로직을 수정할 때 content 필드가 포함되지 않도록 주의하십시오.
        const service = createSupabaseServiceClient();
        const { data: posts, error } = await service
            .from("posts")
            .select("id,slug,type,visibility,title,created_at,updated_at,thumbnail_image_key,comments(count)")
            .eq("type", "diary")
            .order("created_at", { ascending: false });

        if (error) throw new Error(`DB Error: ${error.message}`);

        return (posts ?? []).map((p) => {
            const row = p as unknown as PostRow;
            return {
                id: row.id,
                slug: row.slug,
                type: row.type,
                visibility: row.visibility,
                title: row.visibility === "private" ? "일기" : row.title,
                content: "", // 🔒 보안: 본문은 절대 클라이언트로 전송하지 않음
                categorySlug: null,
                createdAt: row.created_at,
                updatedAt: row.updated_at ?? row.created_at,
                imageKeys: [],
                thumbnailImageKey: row.thumbnail_image_key,
                commentCount: row.comments?.[0]?.count ?? 0,
            };
        });
    }

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
        .select("id,post_id,parent_id,author_id,content,created_at")
        .eq("post_id", post.id)
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
