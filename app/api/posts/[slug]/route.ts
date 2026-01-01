import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isAdminDb, requireAdmin } from "@/lib/server/admin";
import { publicBlogCategoryTag, publicPostsTag } from "@/lib/server/publicPosts";

async function incrementViewCount(slug: string) {
  try {
    const service = createSupabaseServiceClient();
    const { data, error } = await service.rpc("increment_post_view", {
      p_slug: slug,
    });
    if (error) return null;
    if (typeof data === "number") return data;
    if (typeof data === "bigint") return Number(data);
    return null;
  } catch {
    return null;
  }
}

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
  if (!post && !isAdmin) {
    const service = createSupabaseServiceClient();
    const { data: servicePost, error: serviceError } = await service
      .from("posts")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (serviceError) {
      return NextResponse.json(
        { error: "db_error", details: serviceError.message },
        { status: 500 },
      );
    }

    if (!servicePost) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const isPrivate = servicePost.visibility === "private";
    if (isPrivate && !isAdmin) {
      return NextResponse.json(
        { error: authData.user ? "forbidden" : "unauthorized" },
        { status: authData.user ? 403 : 401 },
      );
    }

    const viewCount =
      servicePost.visibility === "public"
        ? await incrementViewCount(slug)
        : null;

    return NextResponse.json(
      {
        id: servicePost.id,
        slug: servicePost.slug,
        type: servicePost.type,
        visibility: servicePost.visibility,
        title: servicePost.title,
        content: servicePost.content,
        categorySlug: servicePost.category_slug,
        createdAt: servicePost.created_at,
        updatedAt: servicePost.updated_at ?? servicePost.created_at,
        imageKeys: servicePost.image_keys ?? [],
        viewCount: viewCount ?? servicePost.view_count ?? 0,
      },
      { status: 200 },
    );
  }
  if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isPrivate = post.visibility === "private";
  if (isPrivate && !isAdmin) {
    return NextResponse.json(
      { error: authData.user ? "forbidden" : "unauthorized" },
      { status: authData.user ? 403 : 401 },
    );
  }

  const viewCount = post.visibility === "public" ? await incrementViewCount(slug) : null;

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
      viewCount: viewCount ?? post.view_count ?? 0,
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
