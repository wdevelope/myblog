import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath, updateTag } from "next/cache";
import { createGuestbookEntry, deleteGuestbookEntry } from "@/lib/actions/guestbook";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}));

type Result = { data: unknown; error: { code?: string; message: string } | null };

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  calls: [] as unknown[][],
  rpcResult: { data: null, error: null } as Result,
  deleteResult: { data: [], error: null } as Result,
  afterTasks: [] as (() => unknown)[],
  notify: vi.fn(),
}));

// 응답 뒤 할 일은 모아 두고 테스트가 직접 돌린다.
vi.mock("next/server", () => ({
  after: (task: () => unknown) => mocks.afterTasks.push(task),
}));

vi.mock("@/lib/server/notify", () => ({
  notifyNewGuestbookEntry: mocks.notify,
}));

// PostgREST 쿼리 체인을 흉내 내고 호출을 기록한다.
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: mocks.getUser },
    rpc: async (...args: unknown[]) => (mocks.calls.push(["rpc", ...args]), mocks.rpcResult),
    from: (table: string) => {
      const query = {
        delete: () => (mocks.calls.push([table, "delete"]), query),
        eq: (...args: unknown[]) => (mocks.calls.push([table, "eq", ...args]), query),
        select: async (...args: unknown[]) => (
          mocks.calls.push([table, "select", ...args]), mocks.deleteResult
        ),
      };
      return query;
    },
  }),
}));

const member = { id: "user-1", app_metadata: {}, user_metadata: {} };
const admin = { id: "admin-1", app_metadata: { is_admin: true }, user_metadata: {} };
const ENTRY_ID = "6b1f7c2e-8d4a-4f0b-9c3e-2a5d7e9f1b3c";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.calls.length = 0;
  mocks.afterTasks.length = 0;
  mocks.rpcResult = { data: "new-id", error: null };
  mocks.deleteResult = { data: [], error: null };
  mocks.getUser.mockResolvedValue({ data: { user: member }, error: null });
});

describe("방명록 쓰기", () => {
  it("로그인하지 않으면 쓰지 않는다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    expect(await createGuestbookEntry({ content: "안녕하세요" })).toEqual({
      success: false,
      error: "로그인 후 쓸 수 있어요.",
    });
    expect(mocks.calls).toEqual([]);
  });

  it("공백만인 내용과 1000자를 넘는 내용은 DB에 보내지 않는다", async () => {
    expect(await createGuestbookEntry({ content: " \n\t " })).toMatchObject({ success: false });
    expect(await createGuestbookEntry({ content: "가".repeat(1001) })).toMatchObject({
      success: false,
      error: "내용은 1~1000자로 써 주세요.",
    });
    expect(mocks.calls).toEqual([]);
  });

  it("일반 사용자는 답글을 쓰지 못한다", async () => {
    expect(await createGuestbookEntry({ content: "답글", parentId: ENTRY_ID })).toEqual({
      success: false,
      error: "답글은 관리자만 쓸 수 있어요.",
    });
    expect(mocks.calls).toEqual([]);
  });

  it("user_metadata.is_admin만 있는 사용자도 답글을 쓰지 못한다", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { ...member, user_metadata: { is_admin: true } } },
      error: null,
    });

    expect(await createGuestbookEntry({ content: "답글", parentId: ENTRY_ID })).toMatchObject({
      success: false,
    });
    expect(mocks.calls).toEqual([]);
  });

  it("다듬은 내용으로 DB 함수를 부르고 방명록 태그와 경로를 무효화한다", async () => {
    expect(await createGuestbookEntry({ content: "  비밀 이야기  ", isSecret: true })).toEqual({
      success: true,
    });

    expect(mocks.calls).toEqual([
      ["rpc", "create_guestbook_entry", { p_content: "비밀 이야기", p_is_secret: true, p_parent_id: undefined }],
    ]);
    expect(updateTag).toHaveBeenCalledWith("guestbook");
    expect(revalidatePath).toHaveBeenCalledWith("/guestbook");
  });

  it("관리자는 답글을 쓴다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: admin }, error: null });

    expect(await createGuestbookEntry({ content: "고마워요", parentId: ENTRY_ID })).toEqual({
      success: true,
    });
    expect(mocks.calls).toEqual([
      ["rpc", "create_guestbook_entry", { p_content: "고마워요", p_is_secret: false, p_parent_id: ENTRY_ID }],
    ]);
  });

  it("RLS가 막으면 한국어 오류를 돌려주고 무효화하지 않는다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: admin }, error: null });
    mocks.rpcResult = { data: null, error: { code: "42501", message: "new row violates row-level security policy" } };

    expect(await createGuestbookEntry({ content: "답글의 답글", parentId: ENTRY_ID })).toEqual({
      success: false,
      error: "이 글은 쓸 수 없어요.",
    });
    expect(updateTag).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("방명록 삭제", () => {
  it("로그인하지 않으면 지우지 않는다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    expect(await deleteGuestbookEntry(ENTRY_ID)).toEqual({ success: false, error: "로그인이 필요해요." });
    expect(mocks.calls).toEqual([]);
  });

  it("uuid가 아닌 id는 DB에 보내지 않는다", async () => {
    expect(await deleteGuestbookEntry("1 or 1=1")).toMatchObject({ success: false });
    expect(mocks.calls).toEqual([]);
  });

  it("RLS에 막혀 지운 행이 없으면 실패를 돌려주고 무효화하지 않는다", async () => {
    mocks.deleteResult = { data: [], error: null };

    expect(await deleteGuestbookEntry(ENTRY_ID)).toEqual({ success: false, error: "지울 수 없는 글이에요." });
    expect(mocks.calls).toEqual([
      ["guestbook_entries", "delete"],
      ["guestbook_entries", "eq", "id", ENTRY_ID],
      ["guestbook_entries", "select", "id"],
    ]);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("지우면 방명록 태그와 경로를 무효화한다", async () => {
    mocks.deleteResult = { data: [{ id: ENTRY_ID }], error: null };

    expect(await deleteGuestbookEntry(ENTRY_ID)).toEqual({ success: true });
    expect(updateTag).toHaveBeenCalledWith("guestbook");
    expect(revalidatePath).toHaveBeenCalledWith("/guestbook");
  });
});

describe("방명록 메일 알림", () => {
  it("일반 사용자가 쓰면 응답 뒤에 작성자·다듬은 내용·비밀 여부로 알린다", async () => {
    await createGuestbookEntry({ content: "  다녀갑니다  ", isSecret: true });

    expect(mocks.notify).not.toHaveBeenCalled();
    expect(mocks.afterTasks).toHaveLength(1);
    await mocks.afterTasks[0]();
    expect(mocks.notify).toHaveBeenCalledWith({
      authorId: "user-1",
      content: "다녀갑니다",
      isSecret: true,
      createdAt: expect.any(String),
    });
  });

  it("관리자가 쓴 글·답글은 알리지 않는다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: admin }, error: null });

    await createGuestbookEntry({ content: "답글", parentId: ENTRY_ID });

    expect(mocks.afterTasks).toEqual([]);
  });

  it("쓰기에 실패하면 알리지 않는다", async () => {
    mocks.rpcResult = { data: null, error: { code: "42501", message: "denied" } };

    await createGuestbookEntry({ content: "안녕하세요" });

    expect(mocks.afterTasks).toEqual([]);
  });
});
