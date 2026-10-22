import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateNickname } from "@/lib/actions/profile";
import { revalidatePublicPosts } from "@/lib/server/publicPosts";

type Result = { data: unknown; error: { code?: string; message: string } | null };

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  calls: [] as unknown[][],
  results: {} as Record<string, Result>,
}));

vi.mock("@/lib/server/publicPosts", () => ({
  revalidatePublicPosts: vi.fn(),
}));

// PostgREST 쿼리 체인을 흉내 내고 표·메서드 호출을 기록한다.
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: (table: string) => {
      const result = mocks.results[table] ?? { data: null, error: null };
      const query = {
        select: (...args: unknown[]) => (mocks.calls.push([table, "select", ...args]), query),
        update: (...args: unknown[]) => (mocks.calls.push([table, "update", ...args]), query),
        eq: (...args: unknown[]) => (mocks.calls.push([table, "eq", ...args]), query),
        then: (resolve: (value: Result) => unknown) => Promise.resolve(result).then(resolve),
      };
      return query;
    },
  }),
}));

const member = { id: "user-1", app_metadata: {}, user_metadata: {} };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.calls.length = 0;
  mocks.results = {};
  mocks.getUser.mockResolvedValue({ data: { user: member }, error: null });
});

describe("닉네임 바꾸기", () => {
  it("로그인하지 않으면 저장하지 않는다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    expect(await updateNickname("테스트회원")).toEqual({ success: false, error: "unauthorized" });
    expect(mocks.calls).toEqual([]);
  });

  it("관리자 이름은 Owen으로 고정이라 바꾸지 않는다", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { ...member, app_metadata: { is_admin: true } } },
      error: null,
    });

    expect(await updateNickname("테스트회원")).toMatchObject({ success: false });
    expect(mocks.calls).toEqual([]);
  });

  it("규칙에 어긋나면 DB에 보내지 않고 이유를 돌려준다", async () => {
    expect(await updateNickname("Owen_1")).toEqual({
      success: false,
      error: "운영자로 보일 수 있는 이름은 쓸 수 없어요.",
    });
    expect(await updateNickname("a")).toMatchObject({ success: false });
    expect(mocks.calls).toEqual([]);
  });

  it("본인 행에 앞뒤 공백을 자른 닉네임을 저장하고, 댓글 단 글을 무효화한다", async () => {
    mocks.results.comments = { data: [{ posts: { slug: "hello", type: "blog" } }], error: null };

    expect(await updateNickname("  테스트회원 ")).toEqual({ success: true });

    expect(mocks.calls).toContainEqual(["profiles", "update", { nickname: "테스트회원" }]);
    expect(mocks.calls).toContainEqual(["profiles", "eq", "id", "user-1"]);
    expect(mocks.calls).toContainEqual(["comments", "eq", "author_id", "user-1"]);
    expect(revalidatePublicPosts).toHaveBeenCalledWith({ type: "blog", slugs: ["hello"] });
  });

  it("이미 쓰는 닉네임(unique 위반)은 안내 문구로 바꾸고 무효화하지 않는다", async () => {
    mocks.results.profiles = { data: null, error: { code: "23505", message: "duplicate key" } };

    expect(await updateNickname("테스트회원")).toEqual({
      success: false,
      error: "이미 쓰는 닉네임이에요.",
    });
    expect(revalidatePublicPosts).not.toHaveBeenCalled();
  });
});
