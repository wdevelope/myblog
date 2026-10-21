"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { assertAdmin, getViewer } from "@/lib/server/admin";
import { revalidatePublicPosts } from "@/lib/server/publicPosts";

function normalizeSlug(input: string) {
  const slug = input.trim();
  if (!slug) return null;
  if (slug.length > 50) return null;
  if (slug.includes("/")) return null;
  return slug;
}

function normalizeVisibility(input: unknown) {
  if (input === "public" || input === "private") return input;
  return null;
}

export type Category = {
  slug: string;
  visibility: "public" | "private";
  sortOrder: number;
  inUse?: number;
};

export type GetCategoriesResult =
  | { success: true; categories: Category[] }
  | { success: false; error: string };

export async function getCategories(): Promise<GetCategoriesResult> {
  const supabase = await createSupabaseServerClient();
  const { isAdmin } = await getViewer();

  const { data: categories, error } = await supabase
    .from("categories")
    .select("slug,visibility,sort_order")
    .order("sort_order", { ascending: true })
    .order("slug", { ascending: true });

  if (error) {
    return { success: false, error: `DB Error: ${error.message}` };
  }

  type CategoryRow = {
    slug: string;
    visibility: "public" | "private";
    sort_order: number;
  };
  const base = ((categories ?? []) as CategoryRow[]).map((c) => ({
    slug: c.slug,
    visibility: c.visibility,
    sortOrder: c.sort_order,
  }));

  if (!isAdmin) {
    return { success: true, categories: base };
  }

  const service = createSupabaseServiceClient();
  const { data: posts, error: postsError } = await service
    .from("posts")
    .select("category_slug")
    .eq("type", "blog")
    .not("category_slug", "is", null);

  if (postsError) {
    return { success: false, error: `DB Error: ${postsError.message}` };
  }

  const counts = (posts ?? []).reduce<Record<string, number>>((acc, row) => {
    const key = row.category_slug?.trim();
    if (!key) return acc;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return {
    success: true,
    categories: base.map((c) => ({
      ...c,
      inUse: counts[c.slug] ?? 0,
    })),
  };
}

export type CreateCategoryResult =
  | { success: true; slug: string }
  | { success: false; error: string };

export async function createCategory(
  slug: string
): Promise<CreateCategoryResult> {
  if (!(await assertAdmin())) return { success: false, error: "unauthorized" };

  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) {
    return { success: false, error: "카테고리 이름을 확인해주세요." };
  }

  const service = createSupabaseServiceClient();
  const { data: existing, error: existingError } = await service
    .from("categories")
    .select("slug")
    .eq("slug", normalizedSlug)
    .maybeSingle();

  if (existingError) {
    return { success: false, error: `DB Error: ${existingError.message}` };
  }
  if (existing) {
    return { success: false, error: "conflict" };
  }

  const { data: maxRow, error: maxError } = await service
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .order("slug", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxError) {
    return { success: false, error: `DB Error: ${maxError.message}` };
  }

  const nextSortOrder = Math.max(0, Number(maxRow?.sort_order ?? 0)) + 1;
  const { data: saved, error } = await service
    .from("categories")
    .insert({
      slug: normalizedSlug,
      visibility: "public",
      sort_order: nextSortOrder,
    })
    .select("slug")
    .single();

  if (error) {
    return { success: false, error: `DB Error: ${error.message}` };
  }

  revalidatePublicPosts({ type: "blog" });

  return { success: true, slug: saved.slug };
}

export type UpdateCategoryInput = {
  slug?: string;
  visibility?: "public" | "private";
};

export type UpdateCategoryResult =
  | { success: true; slug: string }
  | { success: false; error: string };

export async function updateCategory(
  oldSlug: string,
  input: UpdateCategoryInput
): Promise<UpdateCategoryResult> {
  if (!(await assertAdmin())) return { success: false, error: "unauthorized" };

  const normalizedOldSlug = normalizeSlug(oldSlug);
  if (!normalizedOldSlug) {
    return { success: false, error: "카테고리를 확인해주세요." };
  }

  const newSlug = input.slug ? normalizeSlug(input.slug) : null;
  const nextVisibility = normalizeVisibility(input.visibility);
  if (!newSlug && !nextVisibility) {
    return { success: false, error: "변경할 값이 없어요." };
  }

  const service = createSupabaseServiceClient();
  let finalSlug = normalizedOldSlug;

  if (newSlug && newSlug !== normalizedOldSlug) {
    const { data: existing } = await service
      .from("categories")
      .select("slug")
      .eq("slug", newSlug)
      .maybeSingle();

    if (existing) {
      return { success: false, error: "conflict" };
    }

    const { data: updated, error } = await service
      .from("categories")
      .update({ slug: newSlug })
      .eq("slug", normalizedOldSlug)
      .select("slug")
      .maybeSingle();

    if (error) {
      return { success: false, error: `DB Error: ${error.message}` };
    }
    if (!updated) {
      return { success: false, error: "not_found" };
    }
    finalSlug = updated.slug;

    const { error: postsError } = await service
      .from("posts")
      .update({ category_slug: finalSlug })
      .eq("type", "blog")
      .eq("category_slug", normalizedOldSlug);

    if (postsError) {
      await service
        .from("categories")
        .update({ slug: normalizedOldSlug })
        .eq("slug", finalSlug);
      return { success: false, error: `DB Error: ${postsError.message}` };
    }
  }

  if (nextVisibility) {
    const { data: updated, error } = await service
      .from("categories")
      .update({ visibility: nextVisibility })
      .eq("slug", finalSlug)
      .select("slug,visibility")
      .maybeSingle();

    if (error) {
      return { success: false, error: `DB Error: ${error.message}` };
    }
    if (!updated) {
      return { success: false, error: "not_found" };
    }
  }

  revalidatePublicPosts({ type: "blog", categories: [normalizedOldSlug, finalSlug] });

  return { success: true, slug: finalSlug };
}

export type DeleteCategoryResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteCategory(
  slug: string,
  moveTo?: string
): Promise<DeleteCategoryResult> {
  if (!(await assertAdmin())) return { success: false, error: "unauthorized" };

  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) {
    return { success: false, error: "카테고리를 확인해주세요." };
  }

  const normalizedMoveTo = moveTo ? normalizeSlug(moveTo) : null;

  const service = createSupabaseServiceClient();

  const { count, error: countError } = await service
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("type", "blog")
    .eq("category_slug", normalizedSlug);

  if (countError) {
    return { success: false, error: `DB Error: ${countError.message}` };
  }

  const inUse = Number(count ?? 0);
  if (inUse > 0) {
    if (!normalizedMoveTo) {
      return { success: false, error: "in_use" };
    }
    if (normalizedMoveTo === normalizedSlug) {
      return { success: false, error: "이동할 카테고리를 다시 선택해주세요." };
    }

    const { data: moveTarget } = await service
      .from("categories")
      .select("slug")
      .eq("slug", normalizedMoveTo)
      .maybeSingle();

    if (!moveTarget) {
      return { success: false, error: "이동할 카테고리가 존재하지 않아요." };
    }

    const { error: moveError } = await service
      .from("posts")
      .update({ category_slug: normalizedMoveTo })
      .eq("type", "blog")
      .eq("category_slug", normalizedSlug);

    if (moveError) {
      return { success: false, error: `DB Error: ${moveError.message}` };
    }
  }

  const { data: deleted, error } = await service
    .from("categories")
    .delete()
    .eq("slug", normalizedSlug)
    .select("slug")
    .maybeSingle();

  if (error) {
    return { success: false, error: `DB Error: ${error.message}` };
  }
  if (!deleted) {
    return { success: false, error: "not_found" };
  }

  revalidatePublicPosts({ type: "blog", categories: [normalizedSlug, normalizedMoveTo] });

  return { success: true };
}

export type ReorderCategoryResult =
  | { success: true }
  | { success: false; error: string };

export async function reorderCategory(
  slug: string,
  direction: "up" | "down"
): Promise<ReorderCategoryResult> {
  if (!(await assertAdmin())) return { success: false, error: "unauthorized" };

  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug || !["up", "down"].includes(direction)) {
    return { success: false, error: "요청이 올바르지 않아요." };
  }

  const service = createSupabaseServiceClient();
  const { data: rows, error } = await service
    .from("categories")
    .select("slug")
    .order("sort_order", { ascending: true })
    .order("slug", { ascending: true });

  if (error) {
    return { success: false, error: `DB Error: ${error.message}` };
  }

  const slugs = (rows ?? []).map((r) => r.slug).filter(Boolean);
  const idx = slugs.indexOf(normalizedSlug);
  if (idx < 0) {
    return { success: false, error: "not_found" };
  }

  const nextIdx = direction === "up" ? idx - 1 : idx + 1;
  if (nextIdx < 0 || nextIdx >= slugs.length) {
    return { success: true }; // 이동 불가하지만 에러는 아님
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
    return { success: false, error: `DB Error: ${saveError.message}` };
  }

  revalidatePublicPosts({ type: "blog" });

  return { success: true };
}
