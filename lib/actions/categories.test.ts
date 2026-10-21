import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCategory, deleteCategory, getCategories } from "@/lib/actions/categories";

type QueryResult = { data: unknown; error: null };

// PostgREST 쿼리 체인을 흉내 내고 쓰기 메서드 호출을 기록한다.
class FakeQuery {
  constructor(
    private result: QueryResult,
    private writes: string[],
  ) {}
  select() { return this; }
  eq() { return this; }
  not() { return this; }
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

const categoryRows = [{ slug: "dev", visibility: "public", sort_order: 1 }];

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
    from: (table: string) =>
      new FakeQuery(
        table === "users"
          ? { data: { is_admin: false }, error: null }
          : { data: categoryRows, error: null },
        mocks.writes,
      ),
  }),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: mocks.createServiceClient,
}));

function signedIn(user: object | null) {
  mocks.getUser.mockResolvedValue({ data: { user }, error: null });
}

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
  mocks.createServiceClient.mockReturnValue({
    from: () => new FakeQuery({ data: null, error: null }, mocks.writes),
  });
});

describe("카테고리 액션 권한", () => {
  it("세션 없이 위조한 관리자 헤더만 있으면 카테고리를 만들지 않고 실패를 돌려준다", async () => {
    mocks.requestHeaders.set("x-user-id", "attacker");
    mocks.requestHeaders.set("x-user-is-admin", "true");
    signedIn(null);

    expect(await createCategory("hack")).toEqual({ success: false, error: "unauthorized" });
    expect(mocks.writes).toEqual([]);
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
  });

  it("user_metadata.is_admin만 있는 사용자는 카테고리를 지우지 못한다", async () => {
    signedIn(userMetadataAdmin);

    expect(await deleteCategory("dev")).toEqual({ success: false, error: "unauthorized" });
    expect(mocks.writes).toEqual([]);
  });

  it("user_metadata.is_admin만 있는 사용자의 목록 조회는 service role로 사용 개수를 세지 않는다", async () => {
    signedIn(userMetadataAdmin);

    expect(await getCategories()).toEqual({
      success: true,
      categories: [{ slug: "dev", visibility: "public", sortOrder: 1 }],
    });
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
  });
});
