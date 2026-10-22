import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCommentsDirectly, getPostForRoute, getPostsDirectly, loadPostForEdit } from "@/lib/server/posts";

type QueryResult = { data: unknown; error: null };

// PostgREST 쿼리 체인을 흉내 내고 어떤 조건이 붙었는지 기록한다.
function createQuery(result: QueryResult) {
  const calls: [string, ...unknown[]][] = [];
  const query = {
    calls,
    select: (...args: unknown[]) => (calls.push(["select", ...args]), query),
    eq: (...args: unknown[]) => (calls.push(["eq", ...args]), query),
    order: (...args: unknown[]) => (calls.push(["order", ...args]), query),
    maybeSingle: async () => result,
    then: (resolve: (value: QueryResult) => unknown) => Promise.resolve(result).then(resolve),
  };
  return query;
}

const mocks = vi.hoisted(() => ({
  requestHeaders: new Headers(),
  getUser: vi.fn(),
  tables: {} as Record<string, unknown>,
}));

vi.mock("next/headers", () => ({
  headers: async () => mocks.requestHeaders,
}));

// redirect·notFound는 실제로 렌더링을 끊으므로 예외로 흉내 낸다.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: (table: string) => mocks.tables[table],
  }),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: vi.fn(),
}));

const privatePostRow = {
  id: "post-1",
  slug: "secret",
  type: "blog",
  visibility: "private",
  title: "비공개 글",
  content: "<p>본문</p>",
  category_slug: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: null,
  image_keys: null,
  thumbnail_image_key: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of [...mocks.requestHeaders.keys()]) {
    mocks.requestHeaders.delete(key);
  }
});

describe("관리자 판정에 따른 글 조회", () => {
  it("세션 없이 위조한 관리자 헤더만 있으면 공개 글만 조회한다", async () => {
    mocks.requestHeaders.set("x-user-id", "attacker");
    mocks.requestHeaders.set("x-user-is-admin", "true");
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const posts = createQuery({ data: [], error: null });
    mocks.tables.posts = posts;

    await getPostsDirectly({ type: "blog" });

    expect(posts.calls).toContainEqual(["eq", "visibility", "public"]);
  });

  it("user_metadata.is_admin만 있는 사용자는 상세에서도 공개 글만 조회한다", async () => {
    const user = {
      id: "user-1",
      aud: "authenticated",
      created_at: "2026-01-01T00:00:00Z",
      app_metadata: {},
      user_metadata: { is_admin: true },
    };
    mocks.getUser.mockResolvedValue({ data: { user }, error: null });
    const posts = createQuery({ data: null, error: null });
    mocks.tables.posts = posts;

    await getPostForRoute("blog", "secret");

    expect(posts.calls).toContainEqual(["eq", "visibility", "public"]);
  });
});

const adminUser = {
  id: "admin-1",
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00Z",
  app_metadata: { is_admin: true },
  user_metadata: {},
};

describe("getPostForRoute", () => {
  it("경로의 글 타입과 slug로 조회해 다른 타입 글은 찾지 않는다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const posts = createQuery({ data: null, error: null });
    mocks.tables.posts = posts;

    await getPostForRoute("diary", "hello");

    expect(posts.calls).toContainEqual(["eq", "slug", "hello"]);
    expect(posts.calls).toContainEqual(["eq", "type", "diary"]);
  });

  it("없는 글이면 예외 대신 null을 돌려준다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mocks.tables.posts = createQuery({ data: null, error: null });

    await expect(getPostForRoute("blog", "missing")).resolves.toBeNull();
  });

  it("관리자는 공개 범위 필터 없이 비공개 글도 조회한다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: adminUser }, error: null });
    const posts = createQuery({ data: privatePostRow, error: null });
    mocks.tables.posts = posts;

    const post = await getPostForRoute("blog", "secret");

    expect(posts.calls).not.toContainEqual(["eq", "visibility", "public"]);
    expect(post).toMatchObject({ slug: "secret", visibility: "private" });
  });
});

describe("loadPostForEdit", () => {
  it("비로그인 사용자는 수정 화면 경로를 from으로 달아 로그인으로 보낸다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(loadPostForEdit("blog", "hello")).rejects.toThrow(
      `REDIRECT /login?from=${encodeURIComponent("/article/edit/hello")}`
    );
  });

  it("관리자가 없는 글이나 다른 타입 글을 열면 404로 보낸다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: adminUser }, error: null });
    mocks.tables.posts = createQuery({ data: null, error: null });

    await expect(loadPostForEdit("feed", "missing")).rejects.toThrow("NOT_FOUND");
  });

  it("관리자에게 해당 타입 글을 돌려준다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: adminUser }, error: null });
    mocks.tables.posts = createQuery({ data: privatePostRow, error: null });

    await expect(loadPostForEdit("blog", "secret")).resolves.toMatchObject({ slug: "secret" });
  });
});

describe("getCommentsDirectly", () => {
  const commentRow = {
    id: "comment-1",
    post_id: "post-1",
    parent_id: null,
    author_id: "user-1",
    author_is_admin: true,
    content: "댓글",
    created_at: "2026-01-02T00:00:00Z",
  };

  it("넘겨받은 글로 판정하고 글을 다시 읽지 않은 채 댓글만 한 번 조회한다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const posts = createQuery({ data: null, error: null });
    const comments = createQuery({ data: [commentRow], error: null });
    mocks.tables.posts = posts;
    mocks.tables.comments = comments;

    const result = await getCommentsDirectly({ id: "post-1", type: "blog", visibility: "public" });

    expect(posts.calls).toEqual([]);
    expect(comments.calls).toContainEqual(["eq", "post_id", "post-1"]);
    expect(result).toEqual([
      {
        id: "comment-1",
        postId: "post-1",
        parentId: null,
        authorId: "user-1",
        authorIsAdmin: true,
        content: "댓글",
        createdAt: "2026-01-02T00:00:00Z",
      },
    ]);
  });

  it("다이어리 글이면 댓글을 조회하지 않고 빈 배열을 돌려준다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: adminUser }, error: null });
    const comments = createQuery({ data: [commentRow], error: null });
    mocks.tables.comments = comments;

    await expect(
      getCommentsDirectly({ id: "post-1", type: "diary", visibility: "public" })
    ).resolves.toEqual([]);
    expect(comments.calls).toEqual([]);
  });

  it("비관리자에게 비공개 글의 댓글은 조회하지 않는다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const comments = createQuery({ data: [commentRow], error: null });
    mocks.tables.comments = comments;

    await expect(
      getCommentsDirectly({ id: "post-1", type: "blog", visibility: "private" })
    ).resolves.toEqual([]);
    expect(comments.calls).toEqual([]);
  });

  it("관리자는 비공개 글의 댓글도 조회한다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: adminUser }, error: null });
    const comments = createQuery({ data: [commentRow], error: null });
    mocks.tables.comments = comments;

    const result = await getCommentsDirectly({ id: "post-1", type: "blog", visibility: "private" });

    expect(result).toHaveLength(1);
  });
});
