import "server-only";

import { z } from "zod";
import { dbFailure } from "@/lib/server/dbFailure";
import type { createSupabaseServiceClient } from "@/lib/supabase/service";

export const CATEGORY_NAME_RULE = "카테고리 이름을 확인해주세요.";

// 이름이 주소(/article/category/<이름>)에 들어가므로 /를 막는다.
export const categoryNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .refine((name) => !name.includes("/"));

// 카테고리 설정 화면과 글 저장의 자동 생성이 같은 이름 규칙·순서로 만들게 한 곳에 둔다.
// 이미 있으면 created가 false다. 새 카테고리는 맨 뒤에 공개로 만든다.
export async function ensureCategory(
  service: ReturnType<typeof createSupabaseServiceClient>,
  name: unknown
) {
  const parsed = categoryNameSchema.safeParse(name);
  if (!parsed.success) return { success: false as const, error: CATEGORY_NAME_RULE };

  const { data: last, error: lastError } = await service
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .order("slug", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) return dbFailure("카테고리 순서 조회", lastError);

  const { error } = await service.from("categories").insert({
    slug: parsed.data,
    visibility: "public",
    sort_order: Math.max(0, last?.sort_order ?? 0) + 1,
  });
  if (error && error.code !== "23505") return dbFailure("카테고리 생성", error);

  return { success: true as const, slug: parsed.data, created: !error };
}
