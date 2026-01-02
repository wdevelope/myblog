import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isAdminDb, requireAdmin } from "@/lib/server/admin";
import { publicPostsTag } from "@/lib/server/publicPosts";

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

type CategoryRow = {
  slug: string;
  visibility: "public" | "private";
  sort_order: number;
};

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const isAdmin = await isAdminDb(authData.user);

  const { data: categories, error } = await supabase
    .from("categories")
    .select("slug,visibility,sort_order")
    .order("sort_order", { ascending: true })
    .order("slug", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "db_error", details: error.message }, { status: 500 });
  }

  const base = ((categories ?? []) as CategoryRow[]).map((c) => ({
    slug: c.slug,
    visibility: c.visibility,
    sortOrder: c.sort_order,
  }));
  if (!isAdmin) return NextResponse.json({ categories: base }, { status: 200 });

  const service = createSupabaseServiceClient();
  const { data: posts, error: postsError } = await service
    .from("posts")
    .select("category_slug")
    .eq("type", "blog")
    .not("category_slug", "is", null);

  if (postsError) {
    return NextResponse.json(
      { error: "db_error", details: postsError.message },
      { status: 500 },
    );
  }

  const counts = (posts ?? []).reduce<Record<string, number>>((acc, row) => {
    const key = row.category_slug?.trim();
    if (!key) return acc;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json(
    {
      categories: base.map((c) => ({
        ...c,
        inUse: counts[c.slug] ?? 0,
      })),
    },
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

  await requireAdmin(from);

  const body = (await request.json()) as Partial<{ slug: string }>;
  const slug = body.slug ? normalizeSlug(body.slug) : null;
  if (!slug) return badRequest("카테고리 이름을 확인해주세요.");

  const service = createSupabaseServiceClient();
  const { data: existing, error: existingError } = await service
    .from("categories")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { error: "db_error", details: existingError.message },
      { status: 500 },
    );
  }
  if (existing) {
    return NextResponse.json({ error: "conflict" }, { status: 409 });
  }

  const { data: maxRow, error: maxError } = await service
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .order("slug", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxError) {
    return NextResponse.json({ error: "db_error", details: maxError.message }, { status: 500 });
  }

  const nextSortOrder = Math.max(0, Number(maxRow?.sort_order ?? 0)) + 1;
  const { data: saved, error } = await service
    .from("categories")
    .insert({ slug, visibility: "public", sort_order: nextSortOrder })
    .select("slug")
    .single();

  if (error) {
    return NextResponse.json({ error: "db_error", details: error.message }, { status: 500 });
  }

  revalidateTag(publicPostsTag("blog"), "default");
  revalidatePath("/article");
  return NextResponse.json({ slug: saved.slug }, { status: 200 });
}
