import "server-only";

import type { Post, PostType } from "@/lib/types";
import { getSupabaseEnv } from "@/lib/supabase/env";

type NextRequestInit = RequestInit & {
  next?: { revalidate?: number; tags?: string[] };
};

type PostRow = {
  id: string;
  slug: string;
  type: PostType;
  visibility: "public" | "private";
  title: string;
  content: string;
  category_slug: string | null;
  created_at: string;
  updated_at: string | null;
  image_keys: string[] | null;
};

function mapPost(row: PostRow): Post {
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
  };
}

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
}): Promise<Post[]> {
  const { url, anonKey } = getSupabaseEnv();
  const tags = [publicPostsTag(params.type)];
  if (params.type === "blog" && params.category) {
    tags.push(publicBlogCategoryTag(params.category));
  }

  const search = new URLSearchParams();
  search.set(
    "select",
    "id,slug,type,visibility,title,content,category_slug,created_at,updated_at,image_keys",
  );
  search.set("type", `eq.${params.type}`);
  search.set("visibility", "eq.public");
  if (params.category) search.set("category_slug", `eq.${params.category}`);
  search.set("order", "created_at.desc");

  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/posts?${search.toString()}`, {
    method: "GET",
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
      accept: "application/json",
    },
    cache: "force-cache",
    next: { revalidate: params.revalidateSeconds ?? 60, tags },
  } as NextRequestInit);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase REST ${response.status}: ${text}`);
  }

  const rows = (await response.json()) as PostRow[];
  return rows.map(mapPost);
}

