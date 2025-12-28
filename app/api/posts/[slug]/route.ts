import { NextResponse } from "next/server";
import { isLoggedIn } from "@/lib/server/auth";
import { getPostBySlug } from "@/lib/server/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const post = await getPostBySlug({ slug });
  if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const loggedIn = await isLoggedIn();
  if (post.visibility === "private" && !loggedIn) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (post.type === "diary" && !loggedIn) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json(post, { status: 200 });
}

