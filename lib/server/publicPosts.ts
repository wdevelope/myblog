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
    "id,slug,type,visibility,title,content,category_slug,created_at,updated_at,image_keys,thumbnail_image_key"
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
  type: Exclude<PostType, "diary">
): Promise<{ counts: Record<string, number>; total: number }> {
  const { url, anonKey } = getSupabaseEnv();
  const search = new URLSearchParams();
  search.set("select", "category_slug");
  search.set("type", `eq.${type}`);
  search.set("visibility", "eq.public");

  const response = await fetch(
    `${url.replace(/\/$/, "")}/rest/v1/posts?${search.toString()}`,
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

  const rows = (await response.json()) as { category_slug: string | null }[];
  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    const key = row.category_slug?.trim();
    if (!key) return acc;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return { counts, total: rows.length };
}
