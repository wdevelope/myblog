import { env } from "@/lib/env";
import type { Comment, Post, PostType, Visibility } from "@/lib/types";

type FetchJsonOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  accessToken?: string;
  cache?: RequestCache;
};

async function resolveApiBaseUrl() {
  if (env.apiBaseUrl) return env.apiBaseUrl.replace(/\/$/, "");

  if (typeof window !== "undefined") {
    return "/api";
  }

  const { headers } = await import("next/headers");
  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  if (!host) throw new Error("Cannot resolve API base URL (missing Host header)");
  return `${proto}://${host}/api`;
}

async function resolveCookieHeader() {
  if (typeof window !== "undefined") return undefined;
  const { headers } = await import("next/headers");
  const hdrs = await headers();
  return hdrs.get("cookie") ?? undefined;
}

async function fetchJson<T>(path: string, options: FetchJsonOptions = {}) {
  const apiBaseUrl = await resolveApiBaseUrl();
  const normalizedPath = path.replace(/^\/+/, "");
  const url = apiBaseUrl.startsWith("http")
    ? new URL(
        normalizedPath,
        apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`,
      )
    : `${apiBaseUrl.replace(/\/$/, "")}/${normalizedPath}`;

  const cookieHeader = await resolveCookieHeader();
  const headers: Record<string, string> = {
    accept: "application/json",
    ...(options.body ? { "content-type": "application/json" } : null),
    ...(options.headers ?? null),
    ...(cookieHeader ? { cookie: cookieHeader } : null),
  };

  if (options.accessToken) {
    headers.authorization = `Bearer ${options.accessToken}`;
  }

  const response = await fetch(url.toString(), {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: options.cache ?? "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`API ${response.status}: ${text}`) as Error & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }

  return (await response.json()) as T;
}

export async function getPosts(params: {
  type: PostType;
  category?: string;
  accessToken?: string;
}): Promise<Post[]> {
  const search = new URLSearchParams({ type: params.type });
  if (params.category) search.set("category", params.category);
  return fetchJson<Post[]>(`/posts?${search.toString()}`, {
    accessToken: params.accessToken,
  });
}

export async function getPostBySlug(params: {
  slug: string;
  accessToken?: string;
}): Promise<Post> {
  return fetchJson<Post>(`/posts/${encodeURIComponent(params.slug)}`, {
    accessToken: params.accessToken,
  });
}

export async function getComments(params: { postId: string }): Promise<Comment[]> {
  const search = new URLSearchParams({ postId: params.postId });
  return fetchJson<Comment[]>(`/comments?${search.toString()}`);
}

export async function createPost(input: {
  id?: string;
  slug?: string;
  type: PostType;
  visibility: Visibility;
  title: string;
  content: string;
  categorySlug?: string | null;
  imageKeys?: string[];
  thumbnailImageKey?: string | null;
}): Promise<Post> {
  return fetchJson<Post>("/posts", { method: "POST", body: input });
}
