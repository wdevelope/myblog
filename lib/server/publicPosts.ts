import "server-only";

import { revalidatePath, unstable_cache, updateTag } from "next/cache";
import type { Comment, Post, PostType } from "@/lib/types";
import { postHref } from "@/lib/constants";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { mapPost, type PostRow } from "@/lib/server/postRow";

type NextRequestInit = RequestInit & {
  next?: { revalidate?: number; tags?: string[] };
};

// 세그먼트 revalidate(86400)와 같다. 글·카테고리·댓글 쓰기는 태그로 바로 무효화한다.
const PUBLIC_REVALIDATE_SECONDS = 86400;

const POST_COLUMNS =
  "id,slug,type,visibility,title,content,category_slug,created_at,updated_at,image_keys,thumbnail_image_key,comments(count)";

// anon 키로 읽으므로 비공개 글·비공개 카테고리·다이어리는 RLS가 걸러 준다.
function fetchPublicRest(
  table: string,
  search: URLSearchParams,
  tags: string[],
  options: { count?: boolean } = {}
) {
  const { url, anonKey } = getSupabaseEnv();
  return fetch(`${url.replace(/\/$/, "")}/rest/v1/${table}?${search.toString()}`, {
    method: "GET",
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
      accept: "application/json",
      ...(options.count ? { prefer: "count=exact" } : null),
    },
    cache: "force-cache",
    next: { revalidate: PUBLIC_REVALIDATE_SECONDS, tags },
  } as NextRequestInit);
}

export function publicPostsTag(type: PostType) {
  return `posts:public:${type}`;
}

export function publicBlogCategoryTag(categorySlug: string) {
  return `posts:public:blog:category:${categorySlug}`;
}

// 쓰기 액션이 공개 캐시를 무효화하는 유일한 길. 글을 고치면 slug·카테고리가 바뀔 수 있어
// 바뀌기 전·후 값을 모두 받는다.
// updateTag는 서버 액션에서만 부를 수 있다. revalidateTag(tag, profile)는 낡음 표시라
// 쓴 직후 첫 방문자가 이전 목록을 받는다(로드맵 16절).
export function revalidatePublicPosts(params: {
  type: PostType;
  slugs?: (string | null | undefined)[];
  categories?: (string | null | undefined)[];
}) {
  updateTag(publicPostsTag(params.type));
  if (params.type === "blog") {
    for (const category of new Set(params.categories)) {
      if (category) updateTag(publicBlogCategoryTag(category));
    }
  }

  // 목록 페이지는 (home)·(list) route group 안에 있어 type을 주면 태그가 맞지 않는다. 주소로 무효화한다.
  revalidatePath("/");
  revalidatePath(postHref(params.type));
  if (params.type === "feed") return;
  for (const slug of new Set(params.slugs)) {
    if (slug) revalidatePath(postHref(params.type, slug));
  }
}

export async function getPublicPosts(params: {
  type: Exclude<PostType, "diary">;
  category?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: Post[]; count: number }> {
  const tags = [publicPostsTag(params.type)];
  if (params.type === "blog" && params.category) {
    tags.push(publicBlogCategoryTag(params.category));
  }

  const search = new URLSearchParams();
  search.set("select", POST_COLUMNS);
  search.set("type", `eq.${params.type}`);
  search.set("visibility", "eq.public");
  if (params.category) search.set("category_slug", `eq.${params.category}`);
  search.set("order", "created_at.desc");

  // Pagination
  if (params.limit) {
    search.set("limit", params.limit.toString());
    if (params.page) {
      const from = (params.page - 1) * params.limit;
      search.set("offset", from.toString());
    }
  }

  const response = await fetchPublicRest("posts", search, tags, { count: true });

  // 글 수보다 큰 쪽 번호는 PostgREST가 416으로 답한다. 호출부가 빈 목록으로 404를 판단한다.
  if (response.status === 416) {
    return { data: [], count: countFromContentRange(response.headers.get("content-range")) ?? 0 };
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase REST ${response.status}: ${text}`);
  }

  const rows = (await response.json()) as PostRow[];

  const count = countFromContentRange(response.headers.get("content-range")) ?? rows.length;
  return { data: rows.map(mapPost), count };
}

// Content-Range 예: "0-9/100", "*/100". 전체 개수를 모르면("*") null.
function countFromContentRange(contentRange: string | null) {
  const total = contentRange?.split("/")[1];
  return total && total !== "*" ? parseInt(total, 10) : null;
}

export async function getPublicPostCounts(
  type: Exclude<PostType, "blog"> | "blog"
): Promise<{ counts: Record<string, number>; total: number }> {
  // 효율적인 카운팅: categories를 조회하면서 그에 속한 public posts 개수를 세어옵니다.
  // PostgREST: categories?select=slug,posts(count)&posts.type=eq.blog&posts.visibility=eq.public
  const search = new URLSearchParams();
  search.set("select", "slug,posts(count)");
  search.set("posts.type", `eq.${type}`);
  search.set("posts.visibility", "eq.public");

  const response = await fetchPublicRest("categories", search, [publicPostsTag(type)]);

  if (!response.ok) return { counts: {}, total: 0 };

  const categories = (await response.json()) as {
    slug: string;
    posts: [{ count: number }];
  }[];

  let total = 0;
  const counts = categories.reduce<Record<string, number>>((acc, cat) => {
    const postCount = cat.posts?.[0]?.count ?? 0;
    acc[cat.slug] = postCount;
    total += postCount;
    return acc;
  }, {});

  return { counts, total };
}

export async function getPublicPost(
  type: Exclude<PostType, "diary">,
  slug: string
): Promise<Post | null> {
  const search = new URLSearchParams();
  search.set("select", POST_COLUMNS);
  search.set("slug", `eq.${slug}`);
  search.set("type", `eq.${type}`);
  search.set("visibility", "eq.public");
  search.set("limit", "1");

  const response = await fetchPublicRest("posts", search, [publicPostsTag(type)]);
  if (!response.ok) {
    throw new Error(`Supabase REST ${response.status}: ${await response.text()}`);
  }

  const [row] = (await response.json()) as PostRow[];
  return row ? mapPost(row) : null;
}

// 댓글은 누구나 읽는다(5단계 결정 4). 댓글 액션이 그 글 타입 태그를 무효화하므로 같은 태그를 단다.
export async function getPublicComments(
  type: Exclude<PostType, "diary">,
  postId: string
): Promise<Comment[]> {
  const search = new URLSearchParams();
  search.set(
    "select",
    "id,post_id,parent_id,author_id,author_is_admin,content,created_at,author:profiles(nickname,avatar_path)",
  );
  search.set("post_id", `eq.${postId}`);
  search.set("order", "created_at.asc");

  const response = await fetchPublicRest("comments", search, [publicPostsTag(type)]);
  if (!response.ok) {
    throw new Error(`Supabase REST ${response.status}: ${await response.text()}`);
  }

  const rows = (await response.json()) as {
    id: string;
    post_id: string;
    parent_id: string | null;
    author_id: string | null;
    author_is_admin: boolean;
    content: string;
    created_at: string;
    author: { nickname: string | null; avatar_path: string | null } | null;
  }[];
  return rows.map((row) => ({
    id: row.id,
    postId: row.post_id,
    parentId: row.parent_id,
    authorId: row.author_id,
    authorIsAdmin: row.author_is_admin,
    authorNickname: row.author?.nickname ?? null,
    authorAvatarPath: row.author?.avatar_path ?? null,
    content: row.content,
    createdAt: row.created_at,
  }));
}

// 카테고리를 바꾸는 액션은 아티클 태그를 무효화하므로 같은 태그를 단다.
export async function getPublicCategories(): Promise<{ slug: string; sortOrder: number }[]> {
  const search = new URLSearchParams();
  search.set("select", "slug,sort_order");
  search.set("order", "sort_order.asc,slug.asc");

  const response = await fetchPublicRest("categories", search, [publicPostsTag("blog")]);
  if (!response.ok) {
    throw new Error(`Supabase REST ${response.status}: ${await response.text()}`);
  }

  const rows = (await response.json()) as { slug: string; sort_order: number }[];
  return rows.map((row) => ({ slug: row.slug, sortOrder: Number(row.sort_order ?? 0) }));
}

// 다이어리는 RLS가 anon에게 모두 숨기고 본문은 관리자 전용이다(CLAUDE.md 제품 규칙).
// 방문자 목록은 제목만 보이고 모두에게 같으므로, service role로 본문 없이 읽어 쿠키 없이 캐시한다.
// unstable_cache는 호출할 때 감싼다. 모듈을 불러오기만 하는 곳(액션 등)이 캐시 구현에 묶이지 않게 한다.
export function getPublicDiaryIndex() {
  return unstable_cache(loadDiaryIndex, ["public-diary-index"], {
    revalidate: PUBLIC_REVALIDATE_SECONDS,
    tags: [publicPostsTag("diary")],
  })();
}

async function loadDiaryIndex(): Promise<Post[]> {
  const service = createSupabaseServiceClient();
  const { data, error } = await service
    .from("posts")
    .select("id,slug,type,visibility,title,created_at,updated_at,thumbnail_image_key")
    .eq("type", "diary")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`DB Error: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    type: "diary",
    visibility: row.visibility,
    title: row.visibility === "private" ? "일기" : row.title,
    content: "",
    categorySlug: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    imageKeys: [],
    thumbnailImageKey: row.thumbnail_image_key,
    commentCount: 0,
  }));
}
