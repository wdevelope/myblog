import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMyComments } from "@/lib/server/account";

const mocks = vi.hoisted(() => ({
  calls: [] as unknown[][],
  result: { data: [] as unknown[], error: null as { message: string } | null },
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => {
    const query = {
      select: (...args: unknown[]) => (mocks.calls.push(["select", ...args]), query),
      eq: (...args: unknown[]) => (mocks.calls.push(["eq", ...args]), query),
      order: async (...args: unknown[]) => (mocks.calls.push(["order", ...args]), mocks.result),
    };
    return { from: (table: string) => (mocks.calls.push(["from", table]), query) };
  },
}));

beforeEach(() => {
  mocks.calls.length = 0;
  mocks.result = { data: [], error: null };
});

describe("getMyComments", () => {
  it("본인 댓글만 최신순으로 글 정보와 함께 읽는다", async () => {
    mocks.result.data = [
      {
        id: "c2",
        content: "답글",
        created_at: "2026-01-02T00:00:00Z",
        parent_id: "c1",
        posts: { slug: "hello", type: "blog", title: "안녕" },
      },
      {
        id: "c1",
        content: "댓글",
        created_at: "2026-01-01T00:00:00Z",
        parent_id: null,
        posts: [{ slug: "daily", type: "feed", title: "피드" }],
      },
    ];

    const comments = await getMyComments("user-1");

    expect(mocks.calls).toContainEqual(["from", "comments"]);
    expect(mocks.calls).toContainEqual(["eq", "author_id", "user-1"]);
    expect(mocks.calls).toContainEqual(["order", "created_at", { ascending: false }]);
    expect(comments).toEqual([
      {
        id: "c2",
        content: "답글",
        createdAt: "2026-01-02T00:00:00Z",
        isReply: true,
        post: { slug: "hello", type: "blog", title: "안녕" },
      },
      {
        id: "c1",
        content: "댓글",
        createdAt: "2026-01-01T00:00:00Z",
        isReply: false,
        post: { slug: "daily", type: "feed", title: "피드" },
      },
    ]);
  });

  it("조회 오류는 던진다", async () => {
    mocks.result = { data: [], error: { message: "boom" } };

    await expect(getMyComments("user-1")).rejects.toThrow("DB Error: boom");
  });
});
