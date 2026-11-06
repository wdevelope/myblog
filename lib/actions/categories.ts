"use server";

import { z } from "zod";
import { ADMIN_REQUIRED } from "@/lib/constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { assertAdmin, getViewer } from "@/lib/server/admin";
import { CATEGORY_NAME_RULE, categoryNameSchema, ensureCategory } from "@/lib/server/categories";
import { dbFailure } from "@/lib/server/dbFailure";
import { revalidatePublicPosts } from "@/lib/server/publicPosts";
import type { Category } from "@/lib/types";

const CATEGORY_NOT_FOUND = "카테고리를 확인해주세요.";

export type GetCategoriesResult =
  | { success: true; categories: Category[] }
  | { success: false; error: string };

// 세션 클라이언트로 읽어 관리자가 아니면 RLS가 비공개 카테고리를 거른다.
export async function getCategories(): Promise<GetCategoriesResult> {
  const { isAdmin } = await getViewer();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("categories")
    .select("slug,visibility,sort_order,posts(count)")
    .order("sort_order", { ascending: true })
    .order("slug", { ascending: true });

  if (error) return dbFailure("카테고리 목록 조회", error);

  return {
    success: true,
    categories: (data ?? []).map((row) => ({
      slug: row.slug,
      visibility: row.visibility,
      sortOrder: row.sort_order,
      ...(isAdmin ? { inUse: row.posts[0]?.count ?? 0 } : null),
    })),
  };
}

export type CreateCategoryResult =
  | { success: true; slug: string }
  | { success: false; error: string };

export async function createCategory(slug: unknown): Promise<CreateCategoryResult> {
  if (!(await assertAdmin())) return { success: false, error: ADMIN_REQUIRED };

  const ensured = await ensureCategory(createSupabaseServiceClient(), slug);
  if (!ensured.success) return ensured;
  if (!ensured.created) return { success: false, error: "conflict" };

  revalidatePublicPosts({ type: "blog" });

  return { success: true, slug: ensured.slug };
}

const updateCategorySchema = z.object({
  slug: categoryNameSchema.optional(),
  visibility: z.enum(["public", "private"]).optional(),
});

export type UpdateCategoryResult =
  | { success: true; slug: string }
  | { success: false; error: string };

export async function updateCategory(
  oldSlug: unknown,
  input: unknown
): Promise<UpdateCategoryResult> {
  if (!(await assertAdmin())) return { success: false, error: ADMIN_REQUIRED };

  const current = categoryNameSchema.safeParse(oldSlug);
  if (!current.success) return { success: false, error: CATEGORY_NOT_FOUND };

  const changes = updateCategorySchema.safeParse(input);
  if (!changes.success) return { success: false, error: CATEGORY_NAME_RULE };
  const { slug, visibility } = changes.data;
  if (!slug && !visibility) return { success: false, error: "변경할 값이 없어요." };

  // 글의 카테고리는 외래 키(on update cascade)가 같은 문장 안에서 바꾼다. 이름·공개 범위도 한 문장이라 일부만 바뀌지 않는다.
  const service = createSupabaseServiceClient();
  const { data: updated, error } = await service
    .from("categories")
    .update({ ...(slug ? { slug } : null), ...(visibility ? { visibility } : null) })
    .eq("slug", current.data)
    .select("slug")
    .maybeSingle();

  if (error?.code === "23505") return { success: false, error: "conflict" };
  if (error) return dbFailure("카테고리 수정", error);
  if (!updated) return { success: false, error: CATEGORY_NOT_FOUND };

  revalidatePublicPosts({ type: "blog" });

  return { success: true, slug: updated.slug };
}

export type DeleteCategoryResult =
  | { success: true }
  | { success: false; error: string };

const DELETE_CATEGORY_ERRORS: Record<string, string> = {
  in_use: "in_use",
  not_found: CATEGORY_NOT_FOUND,
  move_target_invalid: "이동할 카테고리를 다시 선택해주세요.",
};

export async function deleteCategory(
  slug: unknown,
  moveTo?: unknown
): Promise<DeleteCategoryResult> {
  if (!(await assertAdmin())) return { success: false, error: ADMIN_REQUIRED };

  const target = categoryNameSchema.safeParse(slug);
  if (!target.success) return { success: false, error: CATEGORY_NOT_FOUND };

  const destination = categoryNameSchema.optional().safeParse(moveTo || undefined);
  if (!destination.success) return { success: false, error: DELETE_CATEGORY_ERRORS.move_target_invalid };

  // 글 옮기기와 카테고리 삭제가 나뉘면 사이에서 실패할 때 글만 옮겨진 채로 남아 DB 함수로 한 번에 한다.
  const { data: outcome, error } = await createSupabaseServiceClient().rpc("delete_category", {
    p_slug: target.data,
    p_move_to: destination.data,
  });

  if (error) return dbFailure("카테고리 삭제", error);
  if (outcome !== "deleted") return { success: false, error: DELETE_CATEGORY_ERRORS[outcome] };

  revalidatePublicPosts({ type: "blog" });

  return { success: true };
}

export type ReorderCategoryResult =
  | { success: true }
  | { success: false; error: string };

const reorderDirectionSchema = z.enum(["up", "down"]);

export async function reorderCategory(
  slug: unknown,
  direction: unknown
): Promise<ReorderCategoryResult> {
  if (!(await assertAdmin())) return { success: false, error: ADMIN_REQUIRED };

  const target = categoryNameSchema.safeParse(slug);
  const move = reorderDirectionSchema.safeParse(direction);
  if (!target.success || !move.success) {
    return { success: false, error: "요청이 올바르지 않아요." };
  }

  const { data: outcome, error } = await createSupabaseServiceClient().rpc("move_category", {
    p_slug: target.data,
    p_direction: move.data,
  });

  if (error) return dbFailure("카테고리 순서 변경", error);
  if (outcome === "not_found") return { success: false, error: CATEGORY_NOT_FOUND };
  if (outcome === "moved") revalidatePublicPosts({ type: "blog" });

  return { success: true };
}
