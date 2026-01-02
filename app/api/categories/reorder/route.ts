import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/server/admin";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function normalizeSlug(input: unknown) {
  if (typeof input !== "string") return null;
  const slug = input.trim();
  if (!slug) return null;
  if (slug.length > 50) return null;
  if (slug.includes("/")) return null;
  return slug;
}

function normalizeDirection(input: unknown) {
  if (input === "up" || input === "down") return input;
  return null;
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

  const body = (await request.json().catch(() => null)) as
    | null
    | Partial<{ slug: unknown; direction: unknown }>;
  const slug = normalizeSlug(body?.slug);
  const direction = normalizeDirection(body?.direction);
  if (!slug || !direction) return badRequest("요청이 올바르지 않아요.");

  const service = createSupabaseServiceClient();
  const { data: rows, error } = await service
    .from("categories")
    .select("slug")
    .order("sort_order", { ascending: true })
    .order("slug", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "db_error", details: error.message }, { status: 500 });
  }

  const slugs = (rows ?? []).map((r) => r.slug).filter(Boolean);
  const idx = slugs.indexOf(slug);
  if (idx < 0) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const nextIdx = direction === "up" ? idx - 1 : idx + 1;
  if (nextIdx < 0 || nextIdx >= slugs.length) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const nextSlugs = slugs.slice();
  const tmp = nextSlugs[idx];
  nextSlugs[idx] = nextSlugs[nextIdx];
  nextSlugs[nextIdx] = tmp;

  const payload = nextSlugs.map((s, i) => ({ slug: s, sort_order: i + 1 }));
  const { error: saveError } = await service
    .from("categories")
    .upsert(payload, { onConflict: "slug" });

  if (saveError) {
    return NextResponse.json(
      { error: "db_error", details: saveError.message },
      { status: 500 },
    );
  }

  revalidatePath("/article");
  return NextResponse.json({ ok: true }, { status: 200 });
}

