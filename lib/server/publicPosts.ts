import "server-only";

import type { Post, PostType } from "@/lib/types";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { mapPost, type PostRow } from "@/lib/server/posts";

type NextRequestInit = RequestInit & {
  next?: { revalidate?: number; tags?: string[] };
};

export function publicPostsTag(type: PostType) {
  return `posts:public:${type}`;
}

export function publicBlogCategoryTag(categorySlug: string) {
  return `posts:public:blog:category:${categorySlug}`;
}

export async function getPublicPosts(params: {
  type: Exclude<PostType, "diary">;
  category?: string;
  revalidateSeconds?: number;
  page?: number;
  limit?: number;
}): Promise<{ data: Post[]; count: number }> {
  const { url, anonKey } = getSupabaseEnv();
  const tags = [publicPostsTag(params.type)];
  if (params.type === "blog" && params.category) {
    tags.push(publicBlogCategoryTag(params.category));
  }

  const search = new URLSearchParams();
  search.set(
    "select",
    "id,slug,type,visibility,title,content,category_slug,created_at,updated_at,image_keys,thumbnail_image_key,comments(count)"
  );
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

  const response = await fetch(
    `${url.replace(/\/$/, "")}/rest/v1/posts?${search.toString()}`,
    {
      method: "GET",
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
        accept: "application/json",
        prefer: "count=exact",
      },
      cache: "force-cache",
      next: { revalidate: params.revalidateSeconds ?? 60, tags },
    } as NextRequestInit
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase REST ${response.status}: ${text}`);
  }

  const rows = (await response.json()) as PostRow[];

  // Parse Content-Range header for total count e.g. "0-9/100" or "*/100"
  const contentRange = response.headers.get("content-range");
  let count = rows.length;
  if (contentRange) {
    const total = contentRange.split("/")[1];
    if (total && total !== "*") {
      count = parseInt(total, 10);
    }
  }

  return { data: rows.map(mapPost), count };
}

export async function getPublicPostCounts(
  type: Exclude<PostType, "blog"> | "blog"
): Promise<{ counts: Record<string, number>; total: number }> {
  const { url, anonKey } = getSupabaseEnv();

  // 효율적인 카운팅: categories를 조회하면서 그에 속한 public posts 개수를 세어옵니다.
  // PostgREST: categories?select=slug,posts(count)&posts.type=eq.blog&posts.visibility=eq.public
  const search = new URLSearchParams();
  search.set("select", "slug,posts(count)");
  search.set("posts.type", `eq.${type}`);
  search.set("posts.visibility", "eq.public");

  const response = await fetch(
    `${url.replace(/\/$/, "")}/rest/v1/categories?${search.toString()}`,
    {
      method: "GET",
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
        accept: "application/json",
      },
      next: { revalidate: 60, tags: [publicPostsTag(type)] },
    }
  );

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
