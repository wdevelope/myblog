import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPostBySlugDirectly, getPostsDirectly } from "@/lib/server/posts";

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
  mocks.tables.users = createQuery({ data: { is_admin: false }, error: null });
});

describe("관리자 판정에 따른 글 조회", () => {
  it("세션 없이 위조한 관리자 헤더만 있으면 공개 글만 조회한다", async () => {
    mocks.requestHeaders.set("x-user-id", "attacker");
    mocks.requestHeaders.set("x-user-is-admin", "true");
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const posts = createQuery({ data: [], error: null });
    mocks.tables.posts = posts;

    await getPostsDirectly({ type: "blog", user: { id: "attacker" } });

    expect(posts.calls).toContainEqual(["eq", "visibility", "public"]);
  });

  it("user_metadata.is_admin만 있는 사용자에게는 비공개 글을 403으로 막는다", async () => {
    const user = {
      id: "user-1",
      aud: "authenticated",
      created_at: "2026-01-01T00:00:00Z",
      app_metadata: {},
      user_metadata: { is_admin: true },
    };
    mocks.getUser.mockResolvedValue({ data: { user }, error: null });
    mocks.tables.posts = createQuery({ data: privatePostRow, error: null });

    await expect(getPostBySlugDirectly({ slug: "secret", user })).rejects.toMatchObject({
      status: 403,
    });
  });
});
