import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath, updateTag } from "next/cache";
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
  updateTag: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: mocks.getUser },
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

// 테이블과 고른 열에 따라 결과를 돌려줘 수정 전 행과 저장된 행을 구분한다.
class RoutedQuery {
  private selected = "";
  constructor(private table: string) {}
  select(columns?: string) {
    if (columns) this.selected = columns;
    return this;
  }
  eq() { return this; }
  order() { return this; }
  limit() { return this; }
  insert() { return this; }
  upsert() { return this; }
  async maybeSingle() {
    if (this.table === "categories") return { data: { slug: "dev" }, error: null };
    if (this.selected === "slug,category_slug") {
      return { data: { slug: "post-abc", category_slug: "old" }, error: null };
    }
    return { data: { id: "post-1" }, error: null };
  }
  async single() { return { data: savedRow, error: null }; }
}

describe("createPost 캐시 무효화", () => {
  it("글 수정으로 카테고리가 바뀌면 옛 카테고리와 새 카테고리 목록 캐시를 모두 무효화한다", async () => {
    signedIn(user({ app: { is_admin: true } }));
    mocks.createServiceClient.mockReturnValue({ from: (table: string) => new RoutedQuery(table) });

    const result = await createPost({ ...blogInput, id: "post-1", slug: "post-abc" });

    expect(result.success).toBe(true);
    expect(updateTag).toHaveBeenCalledWith("posts:public:blog:category:old");
    expect(updateTag).toHaveBeenCalledWith("posts:public:blog:category:dev");
  });

  it("아티클은 없는 /blog 경로가 아니라 /article 목록과 상세를 무효화한다", async () => {
    signedIn(user({ app: { is_admin: true } }));
    mocks.createServiceClient.mockReturnValue({ from: (table: string) => new RoutedQuery(table) });

    await createPost({ ...blogInput, id: "post-1", slug: "post-abc" });

    const paths = vi.mocked(revalidatePath).mock.calls.map(([path]) => path);
    expect(paths).not.toContain("/blog");
    expect(paths).toContain("/article");
    expect(paths).toContain("/article/post-abc");
  });
});

// Storage 이동과 글 저장을 한 기록에 남겨 순서를 본다. failMoves는 실패시킬 `버킷:경로`(옮기기 전 위치)다.
function imageService(options: { failMoves?: string[]; failSave?: boolean } = {}) {
  const log: string[] = [];
  const payloads: Record<string, unknown>[] = [];
  const service = {
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        limit: () => query,
        insert: () => query,
        upsert: (payload: Record<string, unknown>) => {
          payloads.push(payload);
          log.push("upsert");
          return query;
        },
        maybeSingle: async () => ({ data: table === "categories" ? { slug: "dev" } : null, error: null }),
        single: async () =>
          options.failSave
            ? { data: null, error: { message: "저장 실패" } }
            : { data: { ...savedRow, ...payloads.at(-1) }, error: null },
      };
      return query;
    },
    storage: {
      from: (bucket: string) => ({
        move: async (fromPath: string, toPath: string, moveOptions: { destinationBucket: string }) => {
          log.push(`${bucket}:${fromPath} → ${moveOptions.destinationBucket}:${toPath}`);
          return options.failMoves?.includes(`${bucket}:${fromPath}`)
            ? { data: null, error: { message: "move failed" } }
            : { data: { message: "Successfully moved" }, error: null };
        },
      }),
    },
  };
  mocks.createServiceClient.mockReturnValue(service);
  return { log, payloads };
}

const privateInputWithPublicImages = {
  ...blogInput,
  visibility: "private" as const,
  content: "![](post-images-public:2026-01-03/a.png#w=60)\n![](post-images-private:2026-01-03/b.png)",
  imageKeys: ["post-images-public:2026-01-03/c.png"],
  thumbnailImageKey: "post-images-public:2026-01-03/a.png",
};

describe("createPost 이미지 버킷", () => {
  beforeEach(() => {
    signedIn(user({ app: { is_admin: true } }));
  });

  it("비공개로 저장하면 공개 버킷의 본문·첨부·썸네일 이미지를 먼저 비공개 버킷으로 옮기고 키를 바꿔 저장한다", async () => {
    const { log, payloads } = imageService();

    const result = await createPost(privateInputWithPublicImages);

    expect(log).toEqual([
      "post-images-public:2026-01-03/a.png → post-images-private:2026-01-03/a.png",
      "post-images-public:2026-01-03/c.png → post-images-private:2026-01-03/c.png",
      "upsert",
    ]);
    expect(payloads[0]).toMatchObject({
      visibility: "private",
      content: "![](post-images-private:2026-01-03/a.png#w=60)\n![](post-images-private:2026-01-03/b.png)",
      image_keys: ["post-images-private:2026-01-03/c.png"],
      thumbnail_image_key: "post-images-private:2026-01-03/a.png",
    });
    expect(result.success).toBe(true);
  });

  it("피드는 항상 공개라 비공개 버킷 이미지를 공개 버킷으로 옮긴다", async () => {
    const { log, payloads } = imageService();

    await createPost({ type: "feed", content: "오늘\n![](post-images-private:2026-01-03/a.png)" });

    expect(log).toEqual([
      "post-images-private:2026-01-03/a.png → post-images-public:2026-01-03/a.png",
      "upsert",
    ]);
    expect(payloads[0]).toMatchObject({
      visibility: "public",
      content: "오늘\n![](post-images-public:2026-01-03/a.png)",
    });
  });

  it("버킷이 맞는 이미지만 있으면 Storage를 부르지 않는다", async () => {
    const { log } = imageService();

    await createPost({ ...blogInput, content: "![](post-images-public:2026-01-03/a.png)" });

    expect(log).toEqual(["upsert"]);
  });

  it("하나라도 못 옮기면 옮긴 이미지를 되돌리고 글을 저장하지 않는다", async () => {
    const { log } = imageService({ failMoves: ["post-images-public:2026-01-03/c.png"] });

    const result = await createPost(privateInputWithPublicImages);

    expect(log).toEqual([
      "post-images-public:2026-01-03/a.png → post-images-private:2026-01-03/a.png",
      "post-images-public:2026-01-03/c.png → post-images-private:2026-01-03/c.png",
      "post-images-private:2026-01-03/a.png → post-images-public:2026-01-03/a.png",
    ]);
    expect(result).toEqual({
      success: false,
      error: "이미지를 옮기지 못해 저장하지 않았어요: post-images-public:2026-01-03/c.png",
    });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("되돌리기까지 실패하면 지금 위치를 오류 문구에 남긴다", async () => {
    imageService({
      failMoves: ["post-images-public:2026-01-03/c.png", "post-images-private:2026-01-03/a.png"],
    });

    const result = await createPost(privateInputWithPublicImages);

    expect(result).toEqual({
      success: false,
      error:
        "이미지를 옮기지 못해 저장하지 않았어요: post-images-public:2026-01-03/c.png 원래 버킷으로 되돌리지 못한 이미지: post-images-private:2026-01-03/a.png",
    });
  });

  it("글 저장이 실패하면 옮긴 이미지를 원래 버킷으로 되돌린다", async () => {
    const { log } = imageService({ failSave: true });

    const result = await createPost(privateInputWithPublicImages);

    expect(log.slice(2)).toEqual([
      "upsert",
      "post-images-private:2026-01-03/a.png → post-images-public:2026-01-03/a.png",
      "post-images-private:2026-01-03/c.png → post-images-public:2026-01-03/c.png",
    ]);
    expect(result).toEqual({ success: false, error: "DB Error: 저장 실패" });
  });
});
