import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath, updateTag } from "next/cache";
import { createComment, deleteComment } from "@/lib/actions/comments";
import { LOGIN_REQUIRED } from "@/lib/constants";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
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
  afterTasks: [] as (() => unknown)[],
}));

// 응답 뒤에 할 일은 모아 두고 테스트가 직접 돌린다.
vi.mock("next/server", () => ({
  after: (task: () => unknown) => {
    mocks.afterTasks.push(task);
  },
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
  mocks.afterTasks.length = 0;
  for (const key of [...mocks.requestHeaders.keys()]) {
    mocks.requestHeaders.delete(key);
  }
  mocks.tables = {};
  mocks.getUser.mockResolvedValue({ data: { user: userMetadataAdmin }, error: null });
});

describe("댓글 액션 권한", () => {
  it("user_metadata.is_admin만 있는 사용자는 남의 댓글을 지우지 못한다", async () => {
    mocks.tables.comments = { author_id: "someone-else", post_id: "post-1" };

    expect(await deleteComment("comment-1")).toEqual({ success: false, error: "본인 댓글만 지울 수 있어요." });
    expect(mocks.writes).toEqual([]);
  });

  it("user_metadata.is_admin만 있는 사용자는 비공개 글에 댓글을 쓰지 못한다", async () => {
    mocks.tables.posts = { id: "post-1", type: "blog", visibility: "private" };

    expect(await createComment({ postSlug: "secret", content: "댓글" })).toEqual({
      success: false,
      error: "글을 찾지 못했어요.",
    });
    expect(mocks.writes).toEqual([]);
  });

  it("세션이 없으면 위조 헤더가 있어도 댓글을 쓰지 못한다", async () => {
    mocks.requestHeaders.set("x-user-id", "attacker");
    mocks.requestHeaders.set("x-user-is-admin", "true");
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    expect(await createComment({ postSlug: "secret", content: "댓글" })).toEqual({
      success: false,
      error: LOGIN_REQUIRED,
    });
    expect(mocks.writes).toEqual([]);
  });
});

describe("댓글 입력", () => {
  it("내용이 공백뿐이면 쓰지 않는다", async () => {
    mocks.tables.posts = { id: "post-1", type: "blog", visibility: "public", slug: "hello", title: "안녕" };

    expect(await createComment({ postSlug: "hello", content: "   " })).toEqual({
      success: false,
      error: "내용을 입력해주세요.",
    });
    expect(mocks.writes).toEqual([]);
  });

  it("문자열이 아닌 값은 DB까지 보내지 않는다", async () => {
    const input = { postSlug: "hello", content: { evil: true } } as never;

    expect(await createComment(input)).toEqual({ success: false, error: "내용을 입력해주세요." });
    expect(await deleteComment(1)).toEqual({ success: false, error: "댓글을 찾지 못했어요." });
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
    expect(updateTag).toHaveBeenCalledWith("posts:public:blog");
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

describe("새 댓글 메일 알림", () => {
  const author = { id: "8353737f-5798-4a1b-9c2d-000000000000", app_metadata: {}, user_metadata: {} };
  const admin = { id: "admin-1", app_metadata: { is_admin: true }, user_metadata: {} };
  const fetchMock = vi.fn();

  async function runAfterTasks() {
    await Promise.all(mocks.afterTasks.map((task) => task()));
  }

  function sentEmail() {
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    return { url, init, body: JSON.parse(init.body as string) };
  }

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("COMMENT_NOTIFY_EMAIL", "owner@example.com");
    mocks.getUser.mockResolvedValue({ data: { user: author }, error: null });
    mocks.tables.posts = { id: "p1", type: "blog", visibility: "public", slug: "hello", title: "첫 글" };
    mocks.tables.comments = {
      id: "c1",
      post_id: "p1",
      parent_id: null,
      author_id: author.id,
      content: "좋은 글",
      created_at: "2026-01-01T00:00:00Z",
    };
    mocks.tables.profiles = { nickname: "테스트회원" };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("관리자가 쓴 댓글은 알리지 않는다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: admin }, error: null });

    expect((await createComment({ postSlug: "hello", content: "좋은 글" })).success).toBe(true);
    await runAfterTasks();

    expect(mocks.afterTasks).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("일반 댓글은 응답을 보낸 뒤 Resend로 알린다", async () => {
    expect((await createComment({ postSlug: "hello", content: "좋은 글" })).success).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();

    await runAfterTasks();

    const { url, init, body } = sentEmail();
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers).toMatchObject({ Authorization: "Bearer re_test_key" });
    expect(body.to).toBe("owner@example.com");
    expect(body.subject).toBe("[w-life] 새 댓글: 첫 글");
    expect(body.text).toContain("작성자: 테스트회원");
    expect(body.text).toContain("좋은 글");
    expect(body).not.toHaveProperty("html");
  });

  it("답글이면 답글로 알린다", async () => {
    // 가짜 쿼리는 표마다 같은 행을 돌려주므로 이 행이 부모 댓글이자 새로 쓴 답글이다.
    const result = await createComment({ postSlug: "hello", content: "좋은 글", parentId: "c1" });
    expect(result.success).toBe(true);

    await runAfterTasks();

    const { body } = sentEmail();
    expect(body.subject).toBe("[w-life] 새 답글: 첫 글");
    expect(body.text).toContain("새 답글이 달렸어요.");
  });

  it.each([
    ["네트워크 오류", () => Promise.reject(new TypeError("fetch failed"))],
    ["500 응답", () => Promise.resolve(new Response("error", { status: 500 }))],
  ])("메일 발송이 실패해도(%s) 댓글 쓰기는 성공한다", async (_name, send) => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockImplementation(send);

    const result = await createComment({ postSlug: "hello", content: "좋은 글" });

    expect(result.success).toBe(true);
    await expect(runAfterTasks()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalled();
  });

  it("키가 없으면 댓글은 쓰고 메일은 보내지 않는다", async () => {
    vi.stubEnv("RESEND_API_KEY", "");

    expect((await createComment({ postSlug: "hello", content: "좋은 글" })).success).toBe(true);
    await runAfterTasks();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("댓글 실패 문구", () => {
  const PUBLIC_POST = { id: "post-1", type: "blog", visibility: "public", slug: "hello", title: "안녕" };

  it("다이어리에는 댓글을 쓸 수 없다고 알린다", async () => {
    mocks.tables.posts = { ...PUBLIC_POST, type: "diary" };

    expect(await createComment({ postSlug: "hello", content: "댓글" })).toEqual({
      success: false,
      error: "다이어리에는 댓글을 쓸 수 없어요.",
    });
  });

  it.each([
    ["사라진 댓글", null, "답글을 달 댓글을 찾지 못했어요."],
    ["다른 글의 댓글", { id: "c1", post_id: "other", parent_id: null }, "답글을 달 댓글을 찾지 못했어요."],
    ["답글", { id: "c2", post_id: "post-1", parent_id: "c1" }, "답글에는 답글을 달 수 없어요."],
  ])("%s에 답글을 달면 이유를 알린다", async (_name, parent, error) => {
    mocks.tables.posts = PUBLIC_POST;
    mocks.tables.comments = parent;

    expect(await createComment({ postSlug: "hello", content: "답글", parentId: "c9" })).toEqual({ success: false, error });
    expect(mocks.writes).toEqual([]);
  });
});
