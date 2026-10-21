import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPost, deletePost } from "@/lib/actions/posts";

type QueryResult = { data: unknown; error: null };

// PostgREST 쿼리 체인을 흉내 내고 쓰기 메서드 호출을 기록한다.
class FakeQuery {
  constructor(
    private result: QueryResult,
    private writes: string[],
  ) {}
  select() { return this; }
  eq() { return this; }
  order() { return this; }
  limit() { return this; }
  insert() { this.writes.push("insert"); return this; }
  update() { this.writes.push("update"); return this; }
  upsert() { this.writes.push("upsert"); return this; }
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
  createServiceClient: vi.fn(),
}));

const savedRow = {
  id: "post-1",
  slug: "post-abc",
  type: "blog",
  visibility: "public",
  title: "제목",
  content: "<p>본문</p>",
  category_slug: "dev",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: null,
  image_keys: [],
  thumbnail_image_key: null,
};

vi.mock("next/headers", () => ({
  headers: async () => mocks.requestHeaders,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: () => new FakeQuery({ data: { is_admin: false }, error: null }, []),
  }),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: mocks.createServiceClient,
}));

const blogInput = {
  type: "blog" as const,
  visibility: "public" as const,
  title: "제목",
  content: "<p>본문</p>",
  categorySlug: "dev",
};

function signedIn(user: object | null) {
  mocks.getUser.mockResolvedValue({ data: { user }, error: null });
}

function user(metadata: { app?: object; user?: object } = {}) {
  return { id: "user-1", app_metadata: metadata.app ?? {}, user_metadata: metadata.user ?? {} };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.writes.length = 0;
  for (const key of [...mocks.requestHeaders.keys()]) {
    mocks.requestHeaders.delete(key);
  }
  mocks.createServiceClient.mockReturnValue({
    from: () => new FakeQuery({ data: savedRow, error: null }, mocks.writes),
  });
});

describe("createPost 권한", () => {
  it("세션 없이 위조한 관리자 헤더만 있으면 저장하지 않고 실패를 돌려준다", async () => {
    mocks.requestHeaders.set("x-user-id", "attacker");
    mocks.requestHeaders.set("x-user-is-admin", "true");
    signedIn(null);

    expect(await createPost(blogInput)).toEqual({ success: false, error: "unauthorized" });
    expect(mocks.writes).toEqual([]);
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
  });

  it("user_metadata.is_admin만 있는 사용자는 저장하지 못한다", async () => {
    signedIn(user({ user: { is_admin: true } }));

    expect(await createPost(blogInput)).toEqual({ success: false, error: "unauthorized" });
    expect(mocks.writes).toEqual([]);
  });
});

describe("deletePost 권한", () => {
  it("관리자가 아니면 삭제하지 않고 실패를 돌려준다", async () => {
    signedIn(user());

    expect(await deletePost("post-abc")).toEqual({ success: false, error: "unauthorized" });
    expect(mocks.writes).toEqual([]);
  });

  it("app_metadata 관리자는 글을 삭제한다", async () => {
    signedIn(user({ app: { is_admin: true } }));

    expect(await deletePost("post-abc")).toEqual({ success: true });
    expect(mocks.writes).toEqual(["delete"]);
  });
});
