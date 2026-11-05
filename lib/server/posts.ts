import "server-only";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getViewer, requireAdmin } from "@/lib/server/admin";
import { COMMENT_COLUMNS, mapComment } from "@/lib/server/commentRow";
import { mapPost } from "@/lib/server/postRow";
import { postHref } from "@/lib/constants";
import type { Post, PostType, Comment } from "@/lib/types";

// PostgREST 서버가 한 응답에 돌려주는 행 수에는 상한이 있어(기본 1000) 이 단위로 나눠 읽는다.
const CATEGORY_SLUG_CHUNK = 1000;

// 개수를 세는 목록이 응답 행 상한에 잘리면 사이드바 숫자가 조용히 틀어지므로 전체 수에 닿을 때까지 읽는다.
async function getArticleCategorySlugs(isAdmin: boolean) {
    const supabase = await createSupabaseServerClient();
    const slugs: (string | null)[] = [];

    while (true) {
        let query = supabase
            .from("posts")
            .select("category_slug", { count: "exact" })
            .eq("type", "blog")
            .order("id")
            .range(slugs.length, slugs.length + CATEGORY_SLUG_CHUNK - 1);

        if (!isAdmin) query = query.eq("visibility", "public");

        const { data, count, error } = await query;
        if (error) throw new Error(`DB Error: ${error.message}`);

        const rows = data ?? [];
        slugs.push(...rows.map((row) => row.category_slug));
        if (rows.length === 0 || slugs.length >= (count ?? 0)) return slugs;
    }
}

// 사이드바 개수에는 비공개 글까지 들어가지만 본문은 이번 쪽의 글만 읽는다.
// 글이 늘어도 관리자 목록의 본문 전송량이 쪽 크기로 묶인다.
export async function getArticleListDirectly(params: {
    category: string;
    page: number;
    limit: number;
}): Promise<{ data: Post[]; count: number; counts: Record<string, number>; total: number }> {
    const { isAdmin } = await getViewer();
    const supabase = await createSupabaseServerClient();
    const from = (params.page - 1) * params.limit;

    // created_at이 같은 글이 쪽 경계에서 겹치거나 빠지지 않게 id로 순서를 끝까지 정한다.
    let query = supabase
        .from("posts")
        .select("*, comments(count)")
        .eq("type", "blog")
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, from + params.limit - 1);

    if (params.category) query = query.eq("category_slug", params.category);
    if (!isAdmin) query = query.eq("visibility", "public");

    const [{ data: posts, error }, slugs] = await Promise.all([query, getArticleCategorySlugs(isAdmin)]);
    if (error) throw new Error(`DB Error: ${error.message}`);

    const counts: Record<string, number> = {};
    for (const slug of slugs) {
        if (slug) counts[slug] = (counts[slug] ?? 0) + 1;
    }

    return {
        data: (posts ?? []).map(mapPost),
        count: params.category ? (counts[params.category] ?? 0) : slugs.length,
        counts,
        total: slugs.length,
    };
}

// 목록은 클라이언트 컴포넌트로 넘어가 페이지 전환 응답에 그대로 실리므로 화면이 쓰는 열만 읽는다.
export async function getDiaryIndexDirectly(): Promise<
    Pick<Post, "id" | "slug" | "title" | "createdAt" | "visibility">[]
> {
    const { isAdmin } = await getViewer();
    const supabase = await createSupabaseServerClient();

    let query = supabase
        .from("posts")
        .select("id,slug,title,created_at,visibility")
        .eq("type", "diary")
        .order("created_at", { ascending: false });

    if (!isAdmin) query = query.eq("visibility", "public");

    const { data, error } = await query;
    if (error) throw new Error(`DB Error: ${error.message}`);

    return (data ?? []).map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        createdAt: row.created_at,
        visibility: row.visibility,
    }));
}

// 없는 글, 경로와 타입이 다른 글, 볼 권한이 없는 글은 모두 null이다. 호출부는 notFound()로 끝낸다.
// 글 쓰기·수정 화면의 카테고리 선택지. 비공개 카테고리는 관리자 세션의 RLS로만 보인다.
export async function getCategorySlugsDirectly() {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
        .from("categories")
        .select("slug")
        .order("sort_order", { ascending: true })
        .order("slug", { ascending: true });

    return (data ?? []).map((row) => row.slug);
}

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

    return post ? mapPost(post) : null;
}

export async function loadPostForEdit(type: PostType, slug: string): Promise<Post> {
    // 로그인 뒤 목록이 아니라 이 수정 화면으로 돌아오게 한다.
    await requireAdmin(`${postHref(type)}/edit/${slug}`);
    const post = await getPostForRoute(type, slug);
    if (!post) notFound();
    return post;
}

// 관리자 상세용. 글을 읽은 뒤 댓글을 또 기다리면 DB 왕복이 하나 늘어 한 요청으로 함께 읽는다.
// 없는 글, 다른 타입 글, 볼 권한이 없는 글은 null이다. 호출부는 notFound()로 끝낸다.
export async function getArticleWithCommentsDirectly(
    slug: string
): Promise<{ post: Post; comments: Comment[] } | null> {
    const { isAdmin } = await getViewer();
    const supabase = await createSupabaseServerClient();

    let query = supabase
        .from("posts")
        .select(`*, comment_list:comments(${COMMENT_COLUMNS})` as const)
        .eq("slug", slug)
        .eq("type", "blog")
        .order("created_at", { ascending: true, referencedTable: "comment_list" });

    if (!isAdmin) query = query.eq("visibility", "public");

    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(`DB Error: ${error.message}`);
    if (!data) return null;

    const { comment_list, ...row } = data;
    const comments = comment_list.map(mapComment);

    return { post: { ...mapPost(row), commentCount: comments.length }, comments };
}
