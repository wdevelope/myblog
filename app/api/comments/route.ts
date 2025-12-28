import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminDb } from "@/lib/server/admin";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const postId = url.searchParams.get("postId");
  if (!postId) return badRequest("postId is required");

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const isAdmin = await isAdminDb(auth.user);

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id,type,visibility")
    .eq("id", postId)
    .maybeSingle();
  if (postError) {
    return NextResponse.json({ error: "db_error", details: postError.message }, { status: 500 });
  }
  if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (post.type === "diary") return badRequest("diary does not support comments");
  if (post.visibility === "private" && !isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: comments, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: "db_error", details: error.message }, { status: 500 });
  }

  return NextResponse.json(
    comments.map((c) => ({
      id: c.id,
      postId: c.post_id,
      content: c.content,
      createdAt: c.created_at,
    })),
    { status: 200 },
  );
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as Partial<{
    postSlug: string;
    content: string;
  }>;

  if (!body.postSlug?.trim()) return badRequest("postSlug is required");
  if (!body.content?.trim()) return badRequest("내용을 입력해주세요.");

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id,type,visibility")
    .eq("slug", body.postSlug)
    .maybeSingle();
  if (postError) {
    return NextResponse.json({ error: "db_error", details: postError.message }, { status: 500 });
  }
  if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (post.type === "diary") return badRequest("diary does not support comments");

  const isAdmin = await isAdminDb(auth.user);
  if (post.visibility === "private" && !isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: created, error } = await supabase
    .from("comments")
    .insert({
      post_id: post.id,
      author_id: auth.user.id,
      content: body.content.trim(),
    })
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ error: "db_error", details: error.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      id: created.id,
      postId: created.post_id,
      content: created.content,
      createdAt: created.created_at,
    },
    { status: 200 },
  );
}
