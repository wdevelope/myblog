import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureAdminSynced, isAdminEmail } from "@/lib/server/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: authData } = await supabase.auth.getUser();
  const isAdmin = isAdminEmail(authData.user?.email);
  if (isAdmin) await ensureAdminSynced(authData.user?.email);

  const { data: post, error } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "db_error", details: error.message }, { status: 500 });
  }
  if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isDiary = post.type === "diary";
  const isPrivate = post.visibility === "private";
  if ((isDiary || isPrivate) && !isAdmin) {
    return NextResponse.json(
      { error: authData.user ? "forbidden" : "unauthorized" },
      { status: authData.user ? 403 : 401 },
    );
  }

  return NextResponse.json(
    {
      id: post.id,
      slug: post.slug,
      type: post.type,
      visibility: post.visibility,
      title: post.title,
      content: post.content,
      categorySlug: post.category_slug,
      createdAt: post.created_at,
      updatedAt: post.updated_at ?? post.created_at,
      imageKeys: post.image_keys ?? [],
    },
    { status: 200 },
  );
}
