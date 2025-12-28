import { NextResponse } from "next/server";
import { isLoggedIn } from "@/lib/server/auth";
import { addComment, getPostBySlug, listComments } from "@/lib/server/db";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const postId = url.searchParams.get("postId");
  if (!postId) return badRequest("postId is required");

  const comments = await listComments({ postId });
  return NextResponse.json(comments, { status: 200 });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<{
    postSlug: string;
    content: string;
  }>;

  if (!body.postSlug?.trim()) return badRequest("postSlug is required");
  if (!body.content?.trim()) return badRequest("content is required");

  const post = await getPostBySlug({ slug: body.postSlug });
  if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (post.type === "diary") return badRequest("diary does not support comments");

  const loggedIn = await isLoggedIn();
  if (post.visibility === "private" && !loggedIn) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const comment = await addComment({ postId: post.id, content: body.content });
  return NextResponse.json(comment, { status: 200 });
}

