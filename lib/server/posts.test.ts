import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getArticleListDirectly,
  getArticleWithCommentsDirectly,
  getCategorySlugsDirectly,
  getDiaryIndexDirectly,
  getPostForRoute,
  loadPostForEdit,
} from "@/lib/server/posts";

type QueryResult = { data: unknown; error: { message: string } | null; count?: number };

// PostgREST 쿼리 체인을 흉내 내고 어떤 조건이 붙었는지 기록한다.
function createQuery(result: QueryResult) {
  const calls: [string, ...unknown[]][] = [];
  const query = {
    calls,
    select: (...args: unknown[]) => (calls.push(["select", ...args]), query),
    eq: (...args: unknown[]) => (calls.push(["eq", ...args]), query),
    order: (...args: unknown[]) => (calls.push(["order", ...args]), query),
    range: (...args: unknown[]) => (calls.push(["range", ...args]), query),
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
    // 한 표를 여러 번 읽는 함수는 배열로 준 쿼리를 부른 순서대로 쓴다.
    from: (table: string) => {
      const entry = mocks.tables[table];
      return Array.isArray(entry) ? entry.shift() : entry;
    },
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
    const page = createQuery({ data: [], error: null });
    const slugs = createQuery({ data: [], error: null, count: 0 });
    mocks.tables.posts = [page, slugs];

    await getArticleListDirectly({ category: "", page: 1, limit: 12 });

    expect(page.calls).toContainEqual(["eq", "visibility", "public"]);
    expect(slugs.calls).toContainEqual(["eq", "visibility", "public"]);
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

describe("getDiaryIndexDirectly", () => {
  const diaryRow = {
    id: "diary-1",
    slug: "diary-secret",
    title: "비공개 일기",
    created_at: "2026-01-01T00:00:00Z",
    visibility: "private",
  };

  it("목록에 쓰는 다섯 열만 읽고 본문 없이 그 필드만 돌려준다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: adminUser }, error: null });
    const posts = createQuery({ data: [diaryRow], error: null });
    mocks.tables.posts = posts;

    const result = await getDiaryIndexDirectly();

    expect(posts.calls).toContainEqual(["select", "id,slug,title,created_at,visibility"]);
    expect(posts.calls).toContainEqual(["eq", "type", "diary"]);
    expect(posts.calls).not.toContainEqual(["eq", "visibility", "public"]);
    expect(result).toEqual([
      {
        id: "diary-1",
        slug: "diary-secret",
        title: "비공개 일기",
        createdAt: "2026-01-01T00:00:00Z",
        visibility: "private",
      },
    ]);
  });

  it("관리자가 아니면 공개 다이어리만 조회한다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const posts = createQuery({ data: [], error: null });
    mocks.tables.posts = posts;

    await getDiaryIndexDirectly();

    expect(posts.calls).toContainEqual(["eq", "visibility", "public"]);
  });
});

describe("getArticleListDirectly", () => {
  const slugRows = [
    { category_slug: "개발" },
    { category_slug: "개발" },
    { category_slug: "비밀노트" },
    { category_slug: null },
    { category_slug: "" },
  ];

  beforeEach(() => {
    mocks.getUser.mockResolvedValue({ data: { user: adminUser }, error: null });
  });

  it("본문은 요청한 쪽의 글만 읽고 개수는 카테고리 이름으로 센다", async () => {
    const page = createQuery({ data: [privatePostRow], error: null });
    const slugs = createQuery({ data: slugRows, error: null, count: slugRows.length });
    mocks.tables.posts = [page, slugs];

    const result = await getArticleListDirectly({ category: "", page: 2, limit: 12 });

    expect(page.calls).toContainEqual(["range", 12, 23]);
    expect(page.calls).toContainEqual(["eq", "type", "blog"]);
    expect(page.calls).not.toContainEqual(["eq", "visibility", "public"]);
    expect(slugs.calls).toContainEqual(["select", "category_slug", { count: "exact" }]);
    expect(result.data.map((post) => post.slug)).toEqual(["secret"]);
    expect(result.count).toBe(5);
    expect(result.total).toBe(5);
    expect(result.counts).toEqual({ 개발: 2, 비밀노트: 1 });
  });

  it("같은 시각의 글이 쪽 사이에서 겹치지 않게 순서를 끝까지 정한다", async () => {
    const page = createQuery({ data: [], error: null });
    mocks.tables.posts = [page, createQuery({ data: [], error: null, count: 0 })];

    await getArticleListDirectly({ category: "", page: 1, limit: 12 });

    expect(page.calls).toContainEqual(["order", "created_at", { ascending: false }]);
    expect(page.calls).toContainEqual(["order", "id"]);
  });

  it("카테고리를 고르면 글 조회에만 조건을 걸고 사이드바 개수는 전체로 센다", async () => {
    const page = createQuery({ data: [], error: null });
    const slugs = createQuery({ data: slugRows, error: null, count: slugRows.length });
    mocks.tables.posts = [page, slugs];

    const result = await getArticleListDirectly({ category: "개발", page: 1, limit: 12 });

    expect(page.calls).toContainEqual(["eq", "category_slug", "개발"]);
    expect(slugs.calls).not.toContainEqual(["eq", "category_slug", "개발"]);
    expect(result.count).toBe(2);
    expect(result.total).toBe(5);
  });

  it("글이 없는 카테고리의 개수는 0이다", async () => {
    mocks.tables.posts = [
      createQuery({ data: [], error: null }),
      createQuery({ data: slugRows, error: null, count: slugRows.length }),
    ];

    const result = await getArticleListDirectly({ category: "빈카테고리", page: 1, limit: 12 });

    expect(result.count).toBe(0);
  });

  it("응답 행 상한에 잘리면 전체 수에 닿을 때까지 이어서 읽는다", async () => {
    const first = createQuery({ data: slugRows.slice(0, 2), error: null, count: 3 });
    const second = createQuery({ data: slugRows.slice(2, 3), error: null, count: 3 });
    mocks.tables.posts = [createQuery({ data: [], error: null }), first, second];

    const result = await getArticleListDirectly({ category: "", page: 1, limit: 12 });

    expect(first.calls).toContainEqual(["range", 0, 999]);
    expect(second.calls).toContainEqual(["range", 2, 1001]);
    expect(result.total).toBe(3);
    expect(result.counts).toEqual({ 개발: 2, 비밀노트: 1 });
  });

  it("조회가 실패하면 빈 목록 대신 예외를 던진다", async () => {
    mocks.tables.posts = [
      createQuery({ data: null, error: { message: "boom" } }),
      createQuery({ data: [], error: null, count: 0 }),
    ];

    await expect(getArticleListDirectly({ category: "", page: 1, limit: 12 })).rejects.toThrow(
      "DB Error: boom"
    );
  });
});

describe("getArticleWithCommentsDirectly", () => {
  const commentRow = {
    id: "comment-1",
    post_id: "post-1",
    parent_id: null,
    author_id: "user-1",
    author_is_admin: true,
    content: "댓글",
    created_at: "2026-01-02T00:00:00Z",
    author: { nickname: "닉네임", avatar_path: null },
  };

  it("글과 댓글을 한 번의 조회로 읽고 댓글 표를 따로 읽지 않는다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: adminUser }, error: null });
    const posts = createQuery({
      data: { ...privatePostRow, comment_list: [commentRow] },
      error: null,
    });
    const comments = createQuery({ data: [], error: null });
    mocks.tables.posts = posts;
    mocks.tables.comments = comments;

    const result = await getArticleWithCommentsDirectly("secret");

    expect(comments.calls).toEqual([]);
    expect(posts.calls).toContainEqual(["eq", "slug", "secret"]);
    expect(posts.calls).toContainEqual(["eq", "type", "blog"]);
    expect(posts.calls).not.toContainEqual(["eq", "visibility", "public"]);
    expect(posts.calls).toContainEqual([
      "order",
      "created_at",
      { ascending: true, referencedTable: "comment_list" },
    ]);
    expect(result?.post).toMatchObject({ slug: "secret", visibility: "private", commentCount: 1 });
    expect(result?.comments).toEqual([
      {
        id: "comment-1",
        postId: "post-1",
        parentId: null,
        authorId: "user-1",
        authorIsAdmin: true,
        authorNickname: "닉네임",
        authorAvatarPath: null,
        content: "댓글",
        createdAt: "2026-01-02T00:00:00Z",
      },
    ]);
  });

  it("댓글이 없는 글은 빈 목록을 돌려준다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: adminUser }, error: null });
    mocks.tables.posts = createQuery({
      data: { ...privatePostRow, comment_list: [] },
      error: null,
    });

    const result = await getArticleWithCommentsDirectly("secret");

    expect(result?.comments).toEqual([]);
    expect(result?.post.commentCount).toBe(0);
  });

  it("없는 글이나 다른 타입 글이면 null을 돌려준다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: adminUser }, error: null });
    mocks.tables.posts = createQuery({ data: null, error: null });

    await expect(getArticleWithCommentsDirectly("missing")).resolves.toBeNull();
  });

  it("관리자가 아니면 공개 글만 조회한다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const posts = createQuery({ data: null, error: null });
    mocks.tables.posts = posts;

    await getArticleWithCommentsDirectly("secret");

    expect(posts.calls).toContainEqual(["eq", "visibility", "public"]);
  });
});

describe("getCategorySlugsDirectly", () => {
  it("카테고리 이름을 정렬 순서대로 돌려준다", async () => {
    const query = createQuery({ data: [{ slug: "개발" }, { slug: "일상" }], error: null });
    mocks.tables.categories = query;

    await expect(getCategorySlugsDirectly()).resolves.toEqual(["개발", "일상"]);
    expect(query.calls).toContainEqual(["order", "sort_order", { ascending: true }]);
  });

  it("읽지 못하면 빈 목록이다", async () => {
    mocks.tables.categories = createQuery({ data: null, error: { message: "boom" } });

    await expect(getCategorySlugsDirectly()).resolves.toEqual([]);
  });
});
