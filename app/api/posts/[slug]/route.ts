import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isAdminDb, requireAdmin } from "@/lib/server/admin";
import { publicBlogCategoryTag, publicPostsTag } from "@/lib/server/publicPosts";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: authData } = await supabase.auth.getUser();
  const isAdmin = await isAdminDb(authData.user);

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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const from = (() => {
    const ref = request.headers.get("referer");
    if (!ref) return "/";
    try {
      const url = new URL(ref);
      return `${url.pathname}${url.search}`;
    } catch {
      return "/";
    }
  })();

  await requireAdmin(from);

  const service = createSupabaseServiceClient();
  const { data: deleted, error } = await service
    .from("posts")
    .delete()
    .eq("slug", slug)
    .select("type,category_slug")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "db_error", details: error.message },
      { status: 500 },
    );
  }
  if (!deleted) return NextResponse.json({ error: "not_found" }, { status: 404 });

  revalidateTag(publicPostsTag(deleted.type), "default");
  if (deleted.type === "blog" && deleted.category_slug) {
    revalidateTag(publicBlogCategoryTag(deleted.category_slug), "default");
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
