import { NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import type { PostType, Visibility } from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isAdminDb, requireAdmin } from "@/lib/server/admin";
import { publicBlogCategoryTag, publicPostsTag } from "@/lib/server/publicPosts";
import { toAutoTitle } from "@/lib/markdown";

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
    const service = createSupabaseServiceClient();
    const { data: posts, error } = await service
      .from("posts")
      .select("id,slug,type,visibility,title,created_at,updated_at,thumbnail_image_key")
      .eq("type", "diary")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "db_error", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      (posts ?? []).map((p) => ({
        id: p.id,
        slug: p.slug,
        type: p.type,
        visibility: p.visibility,
        title: p.title,
        content: "",
        categorySlug: null,
        createdAt: p.created_at,
        updatedAt: p.updated_at ?? p.created_at,
        imageKeys: [],
        thumbnailImageKey: p.thumbnail_image_key,
      })),
      { status: 200 },
    );
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
      thumbnailImageKey: p.thumbnail_image_key,
    })),
    { status: 200 },
  );
}

export async function POST(request: Request) {
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

  const user = await requireAdmin(from);

  const body = (await request.json()) as Partial<{
    id: string;
    slug: string;
    type: PostType;
    visibility: Visibility;
    title: string;
    content: string;
    categorySlug: string | null;
    imageKeys: string[];
    thumbnailImageKey: string | null;
    createdAtYmd: string;
  }>;

  if (!body.type || !["blog", "feed", "diary"].includes(body.type)) {
    return badRequest("type must be one of: blog, feed, diary");
  }
  if (body.type !== "feed") {
    if (!body.visibility || !["public", "private"].includes(body.visibility)) {
      return badRequest("visibility must be public|private");
    }
  }
  if (!body.content?.trim()) return badRequest("내용을 입력해주세요.");
  if (body.type === "blog" && !body.categorySlug?.trim()) {
    return badRequest("아티클은 카테고리가 필요해요.");
  }

  const finalVisibility: Visibility = body.type === "feed" ? "public" : body.visibility!;

  const finalTitle =
    body.type === "feed"
      ? body.title?.trim() || toAutoTitle(body.content)
      : body.title?.trim() ?? "";
  if (!finalTitle) return badRequest("제목을 입력해주세요.");

  const createdAtYmd = body.createdAtYmd?.trim();
  let createdAtIso: string | null = null;
  if (createdAtYmd) {
    if (body.type !== "diary") {
      return badRequest("createdAtYmd는 다이어리에만 사용할 수 있어요.");
    }
    if (body.id) {
      return badRequest("createdAtYmd는 신규 다이어리 작성에서만 사용할 수 있어요.");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(createdAtYmd)) {
      return badRequest("createdAtYmd 형식이 올바르지 않아요. (YYYY-MM-DD)");
    }
    const createdAt = new Date(`${createdAtYmd}T12:00:00+09:00`);
    if (Number.isNaN(createdAt.getTime())) {
      return badRequest("createdAtYmd 날짜가 올바르지 않아요.");
    }
    createdAtIso = createdAt.toISOString();
  }

  // 신규 작성이면 무조건 "post"를 베이스로 사용하고, 
  // 수정 시에는 기존에 제공된 슬러그를 유지하거나 없으면 "post"를 사용합니다.
  const isNew = !body.id;
  const baseSlug = (body.id ? body.slug?.trim() : null) || "post";
  const service = createSupabaseServiceClient();
  const categorySlug =
    body.type === "blog" ? (body.categorySlug?.trim() ?? null) : null;

  if (body.type === "blog" && categorySlug) {
    const { data: existingCategory, error: categoryLookupError } = await service
      .from("categories")
      .select("slug")
      .eq("slug", categorySlug)
      .maybeSingle();

    if (categoryLookupError) {
      return NextResponse.json(
        { error: "db_error", details: categoryLookupError.message },
        { status: 500 },
      );
    }

    if (!existingCategory) {
      const { data: maxRow, error: maxError } = await service
        .from("categories")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .order("slug", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxError) {
        return NextResponse.json(
          { error: "db_error", details: maxError.message },
          { status: 500 },
        );
      }

      const nextSortOrder = Math.max(0, Number(maxRow?.sort_order ?? 0)) + 1;
      const { error: insertError } = await service
        .from("categories")
        .insert({ slug: categorySlug, visibility: "public", sort_order: nextSortOrder });

      if (insertError) {
        const isConflict = typeof insertError.code === "string" && insertError.code === "23505";
        if (!isConflict) {
          return NextResponse.json(
            { error: "db_error", details: insertError.message },
            { status: 500 },
          );
        }
      }
    }
  }

  // ensure slug unique (best-effort)
  let slug = baseSlug;

  // 신규 작성인 경우 항상 랜덤 문자열을 붙여서 post-xxxxxx 형식을 만듭니다.
  if (isNew) {
    slug = `${baseSlug}-${Math.random().toString(16).slice(2, 8)}`;
  }

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
    visibility: finalVisibility,
    title: finalTitle,
    content: body.content,
    category_slug: categorySlug,
    image_keys: body.imageKeys ?? [],
    thumbnail_image_key:
      body.type === "blog" && body.thumbnailImageKey?.trim()
        ? body.thumbnailImageKey.trim()
        : null,
    author_id: user.id,
    ...(createdAtIso ? { created_at: createdAtIso } : null),
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

  // [PERF] 온디맨드 재검증: 글이 변경되면 관련 페이지의 캐시를 즉시 파기하여 실시간 반영되게 합니다.
  revalidatePath("/", "page");
  revalidatePath(`/${saved.type}`, "page");
  if (saved.type === "blog") {
    revalidatePath("/article", "page");
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
      thumbnailImageKey: saved.thumbnail_image_key,
    },
    { status: 200 },
  );
}
