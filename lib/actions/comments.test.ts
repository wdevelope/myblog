import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath, revalidateTag } from "next/cache";
import { createComment, deleteComment } from "@/lib/actions/comments";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: () => unknown) => fn,
}));

type QueryResult = { data: unknown; error: null };

// PostgREST 쿼리 체인을 흉내 내고 쓰기 메서드 호출을 기록한다.
class FakeQuery {
  constructor(
    private result: QueryResult,
    private writes: string[],
  ) {}
  select() { return this; }
  eq() { return this; }
  insert() { this.writes.push("insert"); return this; }
  delete() { this.writes.push("delete"); return this; }
  async maybeSingle() { return this.result; }
  async single() { return this.result; }
  then(resolve: (value: QueryResult) => unknown) {
    return Promise.resolve(this.result).then(resolve);
  }
}

const mocks = vi.hoisted(() => ({
  requestHeaders: new Headers(),
  getUser: vi.fn(),
  writes: [] as string[],
  tables: {} as Record<string, unknown>,
}));

vi.mock("next/headers", () => ({
  headers: async () => mocks.requestHeaders,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: (table: string) =>
      new FakeQuery({ data: mocks.tables[table] ?? null, error: null }, mocks.writes),
  }),
}));

const userMetadataAdmin = {
  id: "user-1",
  app_metadata: {},
  user_metadata: { is_admin: true },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.writes.length = 0;
  for (const key of [...mocks.requestHeaders.keys()]) {
    mocks.requestHeaders.delete(key);
  }
  mocks.tables = { users: { is_admin: false } };
  mocks.getUser.mockResolvedValue({ data: { user: userMetadataAdmin }, error: null });
});

describe("댓글 액션 권한", () => {
  it("user_metadata.is_admin만 있는 사용자는 남의 댓글을 지우지 못한다", async () => {
    mocks.tables.comments = { author_id: "someone-else", post_id: "post-1" };

    expect(await deleteComment("comment-1")).toEqual({ success: false, error: "forbidden" });
    expect(mocks.writes).toEqual([]);
  });

  it("user_metadata.is_admin만 있는 사용자는 비공개 글에 댓글을 쓰지 못한다", async () => {
    mocks.tables.posts = { id: "post-1", type: "blog", visibility: "private" };

    expect(await createComment({ postSlug: "secret", content: "댓글" })).toEqual({
      success: false,
      error: "forbidden",
    });
    expect(mocks.writes).toEqual([]);
  });

  it("세션이 없으면 위조 헤더가 있어도 댓글을 쓰지 못한다", async () => {
    mocks.requestHeaders.set("x-user-id", "attacker");
    mocks.requestHeaders.set("x-user-is-admin", "true");
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    expect(await createComment({ postSlug: "secret", content: "댓글" })).toEqual({
      success: false,
      error: "unauthorized",
    });
    expect(mocks.writes).toEqual([]);
  });
});

describe("댓글 공개 캐시 무효화", () => {
  const author = { id: "user-1", app_metadata: {}, user_metadata: {} };

  it("댓글을 쓰면 그 글의 상세 경로와 목록 태그를 무효화한다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: author }, error: null });
    mocks.tables.posts = { id: "p1", type: "blog", visibility: "public", slug: "hello" };
    mocks.tables.comments = {
      id: "c1",
      post_id: "p1",
      parent_id: null,
      author_id: "user-1",
      content: "좋은 글",
      created_at: "2026-01-01T00:00:00Z",
    };

    const result = await createComment({ postSlug: "hello", content: "좋은 글" });

    expect(result.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/article/hello");
    expect(revalidateTag).toHaveBeenCalledWith("posts:public:blog", "default");
  });

  it("댓글을 지우면 그 글의 상세 경로를 무효화한다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: author }, error: null });
    mocks.tables.comments = {
      author_id: "user-1",
      post_id: "p1",
      posts: { slug: "hello", type: "blog" },
    };

    const result = await deleteComment("c1");

    expect(result.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/article/hello");
  });
});
