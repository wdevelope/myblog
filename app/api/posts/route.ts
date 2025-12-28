import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import type { PostType, Visibility } from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isAdminDb, requireAdmin } from "@/lib/server/admin";
import { publicBlogCategoryTag, publicPostsTag } from "@/lib/server/publicPosts";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s-]/g, "")
    .replaceAll(/\s+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-|-$/g, "");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") as PostType | null;
  const category = url.searchParams.get("category") ?? undefined;

  if (!type || !["blog", "feed", "diary"].includes(type)) {
    return badRequest("type must be one of: blog, feed, diary");
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const isAdmin = await isAdminDb(data.user);

  if (type === "diary" && !isAdmin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let query = supabase
    .from("posts")
    .select("*")
    .eq("type", type)
    .order("created_at", { ascending: false });

  if (category) query = query.eq("category_slug", category);
  if (!isAdmin) query = query.eq("visibility", "public");

  const { data: posts, error } = await query;
  if (error) {
    return NextResponse.json({ error: "db_error", details: error.message }, { status: 500 });
  }

  return NextResponse.json(
    posts.map((p) => ({
      id: p.id,
      slug: p.slug,
      type: p.type,
      visibility: p.visibility,
      title: p.title,
      content: p.content,
      categorySlug: p.category_slug,
      createdAt: p.created_at,
      updatedAt: p.updated_at ?? p.created_at,
      imageKeys: p.image_keys ?? [],
    })),
    { status: 200 },
  );
}

export async function POST(request: Request) {
  const user = await requireAdmin("/admin");

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
  if (!body.title?.trim()) return badRequest("제목을 입력해주세요.");
  if (!body.content?.trim()) return badRequest("내용을 입력해주세요.");
  if (body.type === "blog" && !body.categorySlug?.trim()) {
    return badRequest("블로그 글은 카테고리가 필요해요.");
  }

  const baseSlug = body.slug?.trim() || slugify(body.title) || "post";
  const service = createSupabaseServiceClient();

  // ensure slug unique (best-effort)
  let slug = baseSlug;
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await service
      .from("posts")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing || (body.id && existing.id === body.id)) break;
    slug = `${baseSlug}-${Math.random().toString(16).slice(2, 8)}`;
  }

  const payload = {
    id: body.id,
    slug,
    type: body.type,
    visibility: body.visibility,
    title: body.title,
    content: body.content,
    category_slug: body.categorySlug ?? null,
    image_keys: body.imageKeys ?? [],
    author_id: user.id,
  };

  const { data: saved, error } = await service
    .from("posts")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "db_error", details: error.message }, { status: 500 });
  }

  revalidateTag(publicPostsTag(saved.type), "default");
  if (saved.type === "blog" && saved.category_slug) {
    revalidateTag(publicBlogCategoryTag(saved.category_slug), "default");
  }

  return NextResponse.json(
    {
      id: saved.id,
      slug: saved.slug,
      type: saved.type,
      visibility: saved.visibility,
      title: saved.title,
      content: saved.content,
      categorySlug: saved.category_slug,
      createdAt: saved.created_at,
      updatedAt: saved.updated_at ?? saved.created_at,
      imageKeys: saved.image_keys ?? [],
    },
    { status: 200 },
  );
}
