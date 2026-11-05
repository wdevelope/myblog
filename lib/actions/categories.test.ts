import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import {
  createCategory,
  deleteCategory,
  getCategories,
  reorderCategory,
  updateCategory,
} from "@/lib/actions/categories";
import { DB_FAILURE_MESSAGE } from "@/lib/server/dbFailure";

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

const categoryRows = [{ slug: "dev", visibility: "public", sort_order: 1, posts: [{ count: 2 }] }];

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
  updateTag: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: () => new FakeQuery({ data: categoryRows, error: null }, mocks.writes),
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

describe("카테고리 쓰기", () => {
  type DbError = { code?: string; message: string };

  // 체인의 끝에서 정해 둔 답을 주고, insert·update에 넘긴 값과 rpc 호출을 남긴다.
  function service(answers: { write?: { data: unknown; error: DbError | null }; rpc?: { data: unknown; error: DbError | null } }) {
    const written: unknown[] = [];
    const tables: string[] = [];
    const rpc = vi.fn(async () => answers.rpc ?? { data: "deleted", error: null });
    const write = answers.write ?? { data: { slug: "새 이름" }, error: null };
    const from = (table: string) => {
      tables.push(table);
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        limit: () => query,
        insert: (row: unknown) => {
          written.push(row);
          return query;
        },
        update: (row: unknown) => {
          written.push(row);
          return query;
        },
        maybeSingle: async () => (written.length ? write : { data: { sort_order: 3 }, error: null }),
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(write).then(resolve),
      };
      return query;
    };
    mocks.createServiceClient.mockReturnValue({ from, rpc });
    return { written, tables, rpc };
  }

  const admin = { id: "admin-1", app_metadata: { is_admin: true }, user_metadata: {} };

  beforeEach(() => signedIn(admin));

  it("관리자 목록은 글 수를 한 번의 조회로 받고 service role을 쓰지 않는다", async () => {
    expect(await getCategories()).toEqual({
      success: true,
      categories: [{ slug: "dev", visibility: "public", sortOrder: 1, inUse: 2 }],
    });
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
  });

  it.each([["빈 이름", "  "], ["/가 든 이름", "a/b"], ["50자가 넘는 이름", "가".repeat(51)]])(
    "%s은 만들지 않는다",
    async (_, name) => {
      const { written } = service({});

      expect(await createCategory(name)).toEqual({ success: false, error: "카테고리 이름을 확인해주세요." });
      expect(written).toEqual([]);
    },
  );

  it("이미 있는 이름이면 conflict를 돌려준다", async () => {
    service({ write: { data: null, error: { code: "23505", message: "duplicate" } } });

    expect(await createCategory("dev")).toEqual({ success: false, error: "conflict" });
  });

  it("이름과 공개 범위를 한 문장으로 바꾸고 글은 직접 고치지 않는다", async () => {
    const { written, tables } = service({});

    const result = await updateCategory("dev", { slug: "새 이름", visibility: "private" });

    expect(result).toEqual({ success: true, slug: "새 이름" });
    expect(written).toEqual([{ slug: "새 이름", visibility: "private" }]);
    expect(tables).toEqual(["categories"]);
  });

  it("바꿀 이름이 이미 있으면 conflict를 돌려준다", async () => {
    service({ write: { data: null, error: { code: "23505", message: "duplicate" } } });

    expect(await updateCategory("dev", { slug: "기존" })).toEqual({ success: false, error: "conflict" });
  });

  it("규칙에 안 맞는 새 이름은 조용히 넘어가지 않고 거절한다", async () => {
    const { written } = service({});

    const result = await updateCategory("dev", { slug: "a/b", visibility: "private" });

    expect(result).toEqual({ success: false, error: "카테고리 이름을 확인해주세요." });
    expect(written).toEqual([]);
  });

  it("삭제는 글 옮기기까지 DB 함수 하나로 한다", async () => {
    const { rpc, tables } = service({});

    expect(await deleteCategory("dev", "다른 곳")).toEqual({ success: true });
    expect(rpc).toHaveBeenCalledWith("delete_category", { p_slug: "dev", p_move_to: "다른 곳" });
    expect(tables).toEqual([]);
  });

  it.each([
    ["in_use", "in_use"],
    ["not_found", "not_found"],
    ["move_target_invalid", "이동할 카테고리를 다시 선택해주세요."],
  ])("삭제 결과 %s는 실패로 돌려주고 캐시를 비우지 않는다", async (outcome, error) => {
    service({ rpc: { data: outcome, error: null } });

    expect(await deleteCategory("dev")).toEqual({ success: false, error });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("순서 변경은 DB 함수로 하고 실제로 바뀔 때만 캐시를 비운다", async () => {
    const { rpc } = service({ rpc: { data: "unchanged", error: null } });

    expect(await reorderCategory("dev", "up")).toEqual({ success: true });
    expect(rpc).toHaveBeenCalledWith("move_category", { p_slug: "dev", p_direction: "up" });
    expect(revalidatePath).not.toHaveBeenCalled();

    service({ rpc: { data: "moved", error: null } });
    await reorderCategory("dev", "down");
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("없는 카테고리의 순서를 바꾸면 not_found다", async () => {
    service({ rpc: { data: "not_found", error: null } });

    expect(await reorderCategory("없음", "up")).toEqual({ success: false, error: "not_found" });
  });

  it("잘못된 방향은 DB를 부르지 않는다", async () => {
    const { rpc } = service({});

    expect(await reorderCategory("dev", "left")).toEqual({ success: false, error: "요청이 올바르지 않아요." });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("DB 오류 원문을 돌려주지 않는다", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    service({ rpc: { data: null, error: { message: 'function "delete_category" is broken' } } });

    expect(await deleteCategory("dev")).toEqual({ success: false, error: DB_FAILURE_MESSAGE });
  });
});
