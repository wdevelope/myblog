"use server";

import { after } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/server/admin";
import { revalidateGuestbook } from "@/lib/server/guestbook";
import { notifyNewGuestbookEntry } from "@/lib/server/notify";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GUESTBOOK_CONTENT_MAX } from "@/lib/guestbook";

export type GuestbookResult = { success: true } | { success: false; error: string };

const CONTENT_RULE = `내용은 1~${GUESTBOOK_CONTENT_MAX}자로 써 주세요.`;

const createSchema = z.object({
  content: z
    .string({ error: "내용을 입력해 주세요." })
    .trim()
    .min(1, "내용을 입력해 주세요.")
    .max(GUESTBOOK_CONTENT_MAX, CONTENT_RULE),
  isSecret: z.boolean({ error: "잘못된 요청이에요." }).default(false),
  parentId: z.uuid({ error: "답글을 달 글을 찾지 못했어요." }).nullish(),
});

const entryIdSchema = z.uuid();

// 규칙(본인 이름, 답글은 관리자만·최상위 글에만, 비밀글 답글은 비밀)은 RLS와 create_guestbook_entry가 최종 판정한다.
export async function createGuestbookEntry(input: unknown): Promise<GuestbookResult> {
  const { user, isAdmin } = await getViewer();
  if (!user) {
    return { success: false, error: "로그인 후 쓸 수 있어요." };
  }

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? CONTENT_RULE };
  }
  const { content, isSecret, parentId } = parsed.data;
  if (parentId && !isAdmin) {
    return { success: false, error: "답글은 관리자만 쓸 수 있어요." };
  }

  // 비밀글은 두 표에 나눠 넣으므로 한 트랜잭션인 DB 함수로 쓴다.
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("create_guestbook_entry", {
    p_content: content,
    p_is_secret: isSecret,
    p_parent_id: parentId ?? undefined,
  });

  if (error) {
    if (error.code === "42501") return { success: false, error: "이 글은 쓸 수 없어요." };
    if (error.code === "23503" && parentId) return { success: false, error: "답글을 달 글을 찾지 못했어요." };
    if (error.code === "23514") return { success: false, error: CONTENT_RULE };
    return { success: false, error: "방명록을 남기지 못했어요." };
  }

  revalidateGuestbook();

  // 메일을 받는 사람이 관리자라 관리자 글(답글 포함)은 알리지 않는다. 응답을 늦추지 않게 응답을 보낸 뒤 보낸다.
  if (!isAdmin) {
    const createdAt = new Date().toISOString();
    after(() => notifyNewGuestbookEntry({ authorId: user.id, content, isSecret, createdAt }));
  }

  return { success: true };
}

export async function deleteGuestbookEntry(entryId: unknown): Promise<GuestbookResult> {
  const { user } = await getViewer();
  if (!user) {
    return { success: false, error: "로그인이 필요해요." };
  }

  const parsed = entryIdSchema.safeParse(entryId);
  if (!parsed.success) {
    return { success: false, error: "잘못된 글이에요." };
  }

  // 권한(본인 글, 관리자는 전부)은 RLS가 정한다. 막히면 오류 없이 지운 행이 없으므로 돌려받은 행으로 판단한다.
  // 답글·비밀글 내용은 cascade로 함께 지워진다.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("guestbook_entries")
    .delete()
    .eq("id", parsed.data)
    .select("id");

  if (error) {
    return { success: false, error: "삭제하지 못했어요." };
  }
  if (!data?.length) {
    return { success: false, error: "지울 수 없는 글이에요." };
  }

  revalidateGuestbook();
  return { success: true };
}
