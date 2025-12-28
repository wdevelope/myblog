import { NextResponse } from "next/server";
import type { PostType, Visibility } from "@/lib/types";
import { isLoggedIn } from "@/lib/server/auth";
import { listPosts, upsertPost } from "@/lib/server/db";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") as PostType | null;
  const category = url.searchParams.get("category") ?? undefined;

  if (!type || !["blog", "feed", "diary"].includes(type)) {
    return badRequest("type must be one of: blog, feed, diary");
  }

  const loggedIn = await isLoggedIn();
  if (type === "diary" && !loggedIn) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const posts = await listPosts({
    type,
    category,
    includePrivate: loggedIn,
  });
  return NextResponse.json(posts, { status: 200 });
}

export async function POST(request: Request) {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<{
    id: string;
    slug: string;
    type: PostType;
    visibility: Visibility;
    title: string;
    content: string;
    categorySlug: string | null;
    imageKeys: string[];
  }>;

  if (!body.type || !["blog", "feed", "diary"].includes(body.type)) {
    return badRequest("type must be one of: blog, feed, diary");
  }
  if (!body.visibility || !["public", "private"].includes(body.visibility)) {
    return badRequest("visibility must be public|private");
  }
  if (!body.title?.trim()) return badRequest("title is required");
  if (!body.content?.trim()) return badRequest("content is required");
  if (body.type === "blog" && !body.categorySlug?.trim()) {
    return badRequest("categorySlug is required for blog posts");
  }

  const post = await upsertPost({
    id: body.id,
    slug: body.slug,
    type: body.type,
    visibility: body.visibility,
    title: body.title,
    content: body.content,
    categorySlug: body.categorySlug ?? null,
    imageKeys: body.imageKeys ?? [],
  });

  return NextResponse.json(post, { status: 200 });
}

