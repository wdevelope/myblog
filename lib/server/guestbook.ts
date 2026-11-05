import "server-only";

import { revalidatePath, updateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchPublicRest } from "@/lib/server/publicPosts";
import type { TableRow } from "@/lib/supabase/database";
import type { GuestbookEntry } from "@/lib/guestbook";

// 쓰기·삭제·프로필 변경은 이 태그로 바로 무효화한다(캐시 주기는 공개 글과 같은 하루).
export const GUESTBOOK_TAG = "guestbook";

// 공개 목록은 정적 HTML·공개 캐시에 들어가므로 비밀 내용 표(guestbook_secret_contents)를 여기에 넣지 않는다.
const ENTRY_COLUMNS =
  "id,parent_id,author_id,author_is_admin,is_secret,content,created_at,author:profiles(nickname,avatar_path)";

type EntryRow = TableRow<"guestbook_entries"> & {
  author: Pick<TableRow<"profiles">, "nickname" | "avatar_path"> | null;
};

function mapEntry(row: EntryRow, secretContent: string | null = null): GuestbookEntry {
  return {
    id: row.id,
    parentId: row.parent_id,
    authorId: row.author_id,
    authorIsAdmin: row.author_is_admin,
    authorNickname: row.author?.nickname ?? null,
    authorAvatarPath: row.author?.avatar_path ?? null,
    isSecret: row.is_secret,
    // 표 구조가 바뀌어 비밀글 content가 실려 와도 비밀 내용 표에서 읽은 값 말고는 옮기지 않는다.
    content: row.is_secret ? secretContent : row.content,
    createdAt: row.created_at,
  };
}

// updateTag는 서버 액션에서만 부를 수 있다(revalidatePublicPosts와 같다).
export function revalidateGuestbook() {
  updateTag(GUESTBOOK_TAG);
  revalidatePath("/guestbook");
}

// anon 키로 읽으므로 비밀글 content는 null로 온다. 원글·답글을 한 번에 최신순으로 읽는다.
export async function getPublicGuestbook(): Promise<GuestbookEntry[]> {
  const search = new URLSearchParams({ select: ENTRY_COLUMNS, order: "created_at.desc" });
  const response = await fetchPublicRest("guestbook_entries", search, [GUESTBOOK_TAG]);
  if (!response.ok) {
    throw new Error(`Supabase REST ${response.status}: ${await response.text()}`);
  }

  const rows = (await response.json()) as EntryRow[];
  return rows.map((row) => mapEntry(row));
}

// 관리자 화면(draft mode)용. 쿠키 세션 RLS 클라이언트라 관리자만 비밀 내용까지 읽고, 결과는 정적 HTML에 들어가지 않는다.
export async function getGuestbookDirectly(): Promise<GuestbookEntry[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("guestbook_entries")
    .select(`${ENTRY_COLUMNS},secret:guestbook_secret_contents(content)` as const)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`DB Error: ${error.message}`);

  return (data ?? []).map((row) => mapEntry(row, row.secret?.content ?? null));
}
