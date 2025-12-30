import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/server/admin";
import { publicBlogCategoryTag, publicPostsTag } from "@/lib/server/publicPosts";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function normalizeSlug(input: string) {
  const slug = input.trim();
  if (!slug) return null;
  if (slug.length > 50) return null;
  if (slug.includes("/")) return null;
  return slug;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawOldSlug } = await params;
  const oldSlug = normalizeSlug(rawOldSlug);
  if (!oldSlug) return badRequest("카테고리를 확인해주세요.");

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

  const body = (await request.json()) as Partial<{ slug: string }>;
  const newSlug = body.slug ? normalizeSlug(body.slug) : null;
  if (!newSlug) return badRequest("새 카테고리 이름을 확인해주세요.");
  if (newSlug === oldSlug) return NextResponse.json({ ok: true }, { status: 200 });

  const service = createSupabaseServiceClient();

  const { data: existing } = await service
    .from("categories")
    .select("slug")
    .eq("slug", newSlug)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: "conflict" }, { status: 409 });

  const { data: updated, error } = await service
    .from("categories")
    .update({ slug: newSlug })
    .eq("slug", oldSlug)
    .select("slug")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "db_error", details: error.message }, { status: 500 });
  }
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { error: postsError } = await service
    .from("posts")
    .update({ category_slug: newSlug })
    .eq("type", "blog")
    .eq("category_slug", oldSlug);

  if (postsError) {
    await service.from("categories").update({ slug: oldSlug }).eq("slug", newSlug);
    return NextResponse.json(
      { error: "db_error", details: postsError.message },
      { status: 500 },
    );
  }

  revalidateTag(publicPostsTag("blog"), "default");
  revalidateTag(publicBlogCategoryTag(oldSlug), "default");
  revalidateTag(publicBlogCategoryTag(newSlug), "default");

  return NextResponse.json({ slug: newSlug }, { status: 200 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  const slug = normalizeSlug(rawSlug);
  if (!slug) return badRequest("카테고리를 확인해주세요.");

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

  const body = (await request.json().catch(() => null)) as
    | null
    | Partial<{ moveTo: string }>;
  const moveTo = body?.moveTo ? normalizeSlug(body.moveTo) : null;

  const service = createSupabaseServiceClient();

  const { count, error: countError } = await service
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("type", "blog")
    .eq("category_slug", slug);

  if (countError) {
    return NextResponse.json(
      { error: "db_error", details: countError.message },
      { status: 500 },
    );
  }

  const inUse = Number(count ?? 0);
  if (inUse > 0) {
    if (!moveTo) {
      return NextResponse.json(
        { error: "in_use", message: "사용 중인 카테고리라서 이동 카테고리가 필요해요." },
        { status: 409 },
      );
    }
    if (moveTo === slug) {
      return badRequest("이동할 카테고리를 다시 선택해주세요.");
    }

    const { data: moveTarget } = await service
      .from("categories")
      .select("slug")
      .eq("slug", moveTo)
      .maybeSingle();
    if (!moveTarget) return badRequest("이동할 카테고리가 존재하지 않아요.");

    const { error: moveError } = await service
      .from("posts")
      .update({ category_slug: moveTo })
      .eq("type", "blog")
      .eq("category_slug", slug);
    if (moveError) {
      return NextResponse.json(
        { error: "db_error", details: moveError.message },
        { status: 500 },
      );
    }
  }

  const { data: deleted, error } = await service
    .from("categories")
    .delete()
    .eq("slug", slug)
    .select("slug")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "db_error", details: error.message }, { status: 500 });
  }
  if (!deleted) return NextResponse.json({ error: "not_found" }, { status: 404 });

  revalidateTag(publicPostsTag("blog"), "default");
  revalidateTag(publicBlogCategoryTag(slug), "default");
  if (moveTo) revalidateTag(publicBlogCategoryTag(moveTo), "default");

  return NextResponse.json({ ok: true }, { status: 200 });
}

