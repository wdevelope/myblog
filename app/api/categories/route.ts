import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
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

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const isAdmin = await isAdminDb(authData.user);

  const { data: categories, error } = await supabase
    .from("categories")
    .select("slug")
    .order("slug", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "db_error", details: error.message }, { status: 500 });
  }

  if (!isAdmin) {
    return NextResponse.json({ categories: categories ?? [] }, { status: 200 });
  }

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
      categories: (categories ?? []).map((c) => ({
        slug: c.slug,
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
  const { data: saved, error } = await service
    .from("categories")
    .upsert({ slug }, { onConflict: "slug" })
    .select("slug")
    .single();

  if (error) {
    const isConflict = typeof error.code === "string" && error.code === "23505";
    return NextResponse.json(
      { error: isConflict ? "conflict" : "db_error", details: error.message },
      { status: isConflict ? 409 : 500 },
    );
  }

  revalidateTag(publicPostsTag("blog"), "default");
  return NextResponse.json({ slug: saved.slug }, { status: 200 });
}

