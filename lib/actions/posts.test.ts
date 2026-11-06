import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath, updateTag } from "next/cache";
import { savePost, deletePost } from "@/lib/actions/posts";
import { ADMIN_REQUIRED, POST_CHANGED_ELSEWHERE } from "@/lib/constants";
import { DB_FAILURE_MESSAGE } from "@/lib/server/dbFailure";

type QueryResult = { data: unknown; error: { message: string } | null };

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
  enableDraftMode: vi.fn(),
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
  draftMode: async () => ({ enable: mocks.enableDraftMode }),
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

describe("savePost 권한", () => {
  it("세션 없이 위조한 관리자 헤더만 있으면 저장하지 않고 실패를 돌려준다", async () => {
    mocks.requestHeaders.set("x-user-id", "attacker");
    mocks.requestHeaders.set("x-user-is-admin", "true");
    signedIn(null);

    expect(await savePost(blogInput)).toEqual({ success: false, error: ADMIN_REQUIRED });
    expect(mocks.writes).toEqual([]);
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
  });

  it("user_metadata.is_admin만 있는 사용자는 저장하지 못한다", async () => {
    signedIn(user({ user: { is_admin: true } }));

    expect(await savePost(blogInput)).toEqual({ success: false, error: ADMIN_REQUIRED });
    expect(mocks.writes).toEqual([]);
  });
});

describe("deletePost 권한", () => {
  it("관리자가 아니면 삭제하지 않고 실패를 돌려준다", async () => {
    signedIn(user());

    expect(await deletePost("post-abc")).toEqual({ success: false, error: ADMIN_REQUIRED });
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
    if (this.selected.startsWith("slug,category_slug")) {
      return { data: { slug: "post-abc", category_slug: "old" }, error: null };
    }
    return { data: { id: "post-1" }, error: null };
  }
  async single() { return { data: savedRow, error: null }; }
}

describe("savePost 캐시 무효화", () => {
  it("글 수정으로 카테고리가 바뀌면 옛 카테고리와 새 카테고리 목록 캐시를 모두 무효화한다", async () => {
    signedIn(user({ app: { is_admin: true } }));
    mocks.createServiceClient.mockReturnValue({ from: (table: string) => new RoutedQuery(table) });

    const result = await savePost({ ...blogInput, id: "post-1", slug: "post-abc" });

    expect(result.success).toBe(true);
    expect(updateTag).toHaveBeenCalledWith("posts:public:blog:category:old");
    expect(updateTag).toHaveBeenCalledWith("posts:public:blog:category:dev");
  });

  it("아티클은 없는 /blog 경로가 아니라 /article 목록과 상세를 무효화한다", async () => {
    signedIn(user({ app: { is_admin: true } }));
    mocks.createServiceClient.mockReturnValue({ from: (table: string) => new RoutedQuery(table) });

    await savePost({ ...blogInput, id: "post-1", slug: "post-abc" });

    const paths = vi.mocked(revalidatePath).mock.calls.map(([path]) => path);
    expect(paths).not.toContain("/blog");
    expect(paths).toContain("/article");
    expect(paths).toContain("/article/post-abc");
  });
});

describe("savePost 관리자 화면", () => {
  it("저장에 성공하면 관리자 화면을 켠다", async () => {
    signedIn(user({ app: { is_admin: true } }));

    const result = await savePost(blogInput);

    expect(result.success).toBe(true);
    expect(mocks.enableDraftMode).toHaveBeenCalledTimes(1);
  });

  it("관리자가 아니면 관리자 화면을 켜지 않는다", async () => {
    signedIn(user());

    await savePost(blogInput);

    expect(mocks.enableDraftMode).not.toHaveBeenCalled();
  });

  it("저장이 실패하면 관리자 화면을 켜지 않는다", async () => {
    signedIn(user({ app: { is_admin: true } }));
    mocks.createServiceClient.mockReturnValue({
      from: () => new FakeQuery({ data: null, error: { message: "저장 실패" } }, mocks.writes),
    });

    const result = await savePost({ ...blogInput, type: "diary" });

    expect(result.success).toBe(false);
    expect(mocks.enableDraftMode).not.toHaveBeenCalled();
  });
});

describe("savePost 저장 전 조회", () => {
  // 조회마다 시작한 값을 남기고, 시작한 뒤에도 풀어 줄 때까지 답하지 않는다.
  function pendingService() {
    const started: string[] = [];
    const payloads: Record<string, unknown>[] = [];
    const release = Promise.withResolvers<void>();
    const from = (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        limit: () => query,
        insert: () => query,
        upsert: (payload: Record<string, unknown>) => {
          payloads.push(payload);
          return query;
        },
        maybeSingle: async () => {
          const name = table === "categories" ? "category" : "previous";
          started.push(name);
          await release.promise;
          if (name === "category") return { data: { slug: "dev" }, error: null };
          return { data: { slug: "post-abc", category_slug: "dev" }, error: null };
        },
        single: async () => ({ data: savedRow, error: null }),
      };
      return query;
    };
    return { service: { from }, started, payloads, release };
  }

  it("이전 글·카테고리 조회를 서로 기다리지 않고 한 번에 보낸다", async () => {
    signedIn(user({ app: { is_admin: true } }));
    const { service, started, release } = pendingService();
    mocks.createServiceClient.mockReturnValue(service);

    const saving = savePost({ ...blogInput, id: "post-1", slug: "post-abc" });
    await vi.waitFor(() => expect(started).toHaveLength(2));
    release.resolve();

    expect((await saving).success).toBe(true);
    expect([...started].sort()).toEqual(["category", "previous"]);
  });

  it("글을 고칠 때는 받은 slug를 그대로 저장한다", async () => {
    signedIn(user({ app: { is_admin: true } }));
    const { service, payloads, release } = pendingService();
    release.resolve();
    mocks.createServiceClient.mockReturnValue(service);

    await savePost({ ...blogInput, id: "post-1", slug: "post-abc" });

    expect(payloads[0].slug).toBe("post-abc");
  });
});

type ImageRow = { content: string; image_keys: string[] | null; thumbnail_image_key: string | null; updated_at?: string };

// Storage 이동·삭제와 글 저장·삭제를 한 기록에 남겨 순서를 본다. failMoves는 실패시킬 `버킷:경로`(옮기기 전 위치)다.
// previous는 수정 전 글, deleted는 deletePost가 지운 행, usedBy는 "다른 글이 쓰는지" 조회가 돌려줄 글이다.
function imageService(
  options: {
    failMoves?: string[];
    failSave?: boolean;
    previous?: ImageRow;
    deleted?: ImageRow;
    usedBy?: ImageRow[];
    failLookup?: boolean;
    failRemove?: boolean;
  } = {}
) {
  const log: string[] = [];
  const payloads: Record<string, unknown>[] = [];
  const lookups: [string, string, string[]][] = [];
  const service = {
    from: (table: string) => {
      let selected = "";
      let deleting = false;
      const lookup = (method: string) => (column: string, values: string[]) => {
        lookups.push([method, column, values]);
        return query;
      };
      const query = {
        select: (columns = "") => {
          selected = columns;
          return query;
        },
        eq: () => query,
        order: () => query,
        limit: () => query,
        insert: () => query,
        upsert: (payload: Record<string, unknown>) => {
          payloads.push(payload);
          log.push("upsert");
          return query;
        },
        delete: () => {
          deleting = true;
          log.push("delete");
          return query;
        },
        likeAnyOf: lookup("likeAnyOf"),
        overlaps: lookup("overlaps"),
        in: lookup("in"),
        maybeSingle: async () => {
          if (table === "categories") return { data: { slug: "dev" }, error: null };
          if (deleting) return { data: options.deleted ? { ...savedRow, ...options.deleted } : null, error: null };
          if (selected.includes("content")) {
            return { data: options.previous ? { slug: "post-abc", category_slug: "dev", ...options.previous } : null, error: null };
          }
          return { data: null, error: null };
        },
        single: async () =>
          options.failSave
            ? { data: null, error: { message: "저장 실패" } }
            : { data: { ...savedRow, ...payloads.at(-1) }, error: null },
        then: (resolve: (value: { data: ImageRow[] | null; error: { message: string } | null }) => unknown) =>
          Promise.resolve(
            options.failLookup
              ? { data: null, error: { message: "조회 실패" } }
              : { data: options.usedBy ?? [], error: null }
          ).then(resolve),
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
        remove: async (paths: string[]) => {
          log.push(`remove ${paths.map((path) => `${bucket}:${path}`).join(" ")}`);
          return options.failRemove
            ? { data: null, error: { message: "remove failed" } }
            : { data: [], error: null };
        },
      }),
    },
  };
  mocks.createServiceClient.mockReturnValue(service);
  return { log, payloads, lookups };
}

const privateInputWithPublicImages = {
  ...blogInput,
  visibility: "private" as const,
  content: "![](post-images-public:2026-01-03/a.png#w=60)\n![](post-images-private:2026-01-03/b.png)",
  imageKeys: ["post-images-public:2026-01-03/c.png"],
  thumbnailImageKey: "post-images-public:2026-01-03/a.png",
};

describe("savePost 저장 규칙", () => {
  // 표마다 답을 정하고 upsert·insert에 넘긴 값을 남긴다.
  function savingService(options: {
    category?: { slug: string } | null;
    previous?: object | null;
    upsertErrors?: ({ code?: string; message: string } | null)[];
  } = {}) {
    const upserts: Record<string, unknown>[] = [];
    const inserts: Record<string, unknown>[] = [];
    const errors = [...(options.upsertErrors ?? [])];
    const from = (table: string) => {
      let selected = "";
      const query = {
        select: (columns = "") => {
          selected = columns;
          return query;
        },
        eq: () => query,
        order: () => query,
        limit: () => query,
        insert: (row: Record<string, unknown>) => {
          inserts.push(row);
          return query;
        },
        upsert: (row: Record<string, unknown>) => {
          upserts.push(row);
          return query;
        },
        maybeSingle: async () => {
          if (table === "categories") {
            return { data: selected === "slug" ? (options.category ?? null) : { sort_order: 3 }, error: null };
          }
          if (selected.startsWith("slug,category_slug")) return { data: options.previous ?? null, error: null };
          return { data: null, error: null };
        },
        single: async () => {
          const error = errors.shift() ?? null;
          return error ? { data: null, error } : { data: savedRow, error: null };
        },
        then: (resolve: (value: { data: null; error: null }) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(resolve),
      };
      return query;
    };
    return { service: { from }, upserts, inserts };
  }

  const dev = { slug: "dev" };
  const previous = { slug: "post-abc", category_slug: "dev", content: "", image_keys: [], thumbnail_image_key: null };

  it("글을 고쳐도 처음 쓴 사람을 덮어쓰지 않는다", async () => {
    signedIn(user({ app: { is_admin: true } }));
    const { service, upserts } = savingService({ category: dev, previous });
    mocks.createServiceClient.mockReturnValue(service);

    await savePost({ ...blogInput, id: "post-1", slug: "post-abc" });

    expect(upserts[0]).not.toHaveProperty("author_id");
  });

  it("새 글에는 쓴 사람을 남긴다", async () => {
    signedIn(user({ app: { is_admin: true } }));
    const { service, upserts } = savingService({ category: dev });
    mocks.createServiceClient.mockReturnValue(service);

    await savePost(blogInput);

    expect(upserts[0].author_id).toBe("user-1");
  });

  it.each([["/가 든 이름", "a/b"], ["50자가 넘는 이름", "가".repeat(51)]])(
    "%s은 카테고리를 새로 만들지 않고 저장을 멈춘다",
    async (_, categorySlug) => {
      signedIn(user({ app: { is_admin: true } }));
      const { service, upserts, inserts } = savingService();
      mocks.createServiceClient.mockReturnValue(service);

      const result = await savePost({ ...blogInput, categorySlug });

      expect(result).toEqual({ success: false, error: "카테고리 이름을 확인해주세요." });
      expect(inserts).toEqual([]);
      expect(upserts).toEqual([]);
    },
  );

  it("규칙을 지킨 새 카테고리는 맨 뒤에 공개로 만든다", async () => {
    signedIn(user({ app: { is_admin: true } }));
    const { service, inserts } = savingService();
    mocks.createServiceClient.mockReturnValue(service);

    await savePost({ ...blogInput, categorySlug: "새 이름" });

    expect(inserts).toEqual([{ slug: "새 이름", visibility: "public", sort_order: 4 }]);
  });

  it("저장이 실패하면 DB 오류 원문 대신 일반 문구를 돌려주고 원문은 서버 로그에 남긴다", async () => {
    signedIn(user({ app: { is_admin: true } }));
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const { service } = savingService({
      category: dev,
      upsertErrors: [{ message: 'relation "posts" does not exist' }],
    });
    mocks.createServiceClient.mockReturnValue(service);

    const result = await savePost(blogInput);

    expect(result).toEqual({ success: false, error: DB_FAILURE_MESSAGE });
    expect(logged.mock.calls.flat().join(" ")).toContain('relation "posts" does not exist');
  });

  it("slug가 겹쳐 저장이 막히면 새 slug로 다시 저장한다", async () => {
    signedIn(user({ app: { is_admin: true } }));
    const { service, upserts } = savingService({
      category: dev,
      upsertErrors: [{ code: "23505", message: "duplicate key" }],
    });
    mocks.createServiceClient.mockReturnValue(service);

    const result = await savePost(blogInput);

    expect(result.success).toBe(true);
    expect(upserts).toHaveLength(2);
    expect(upserts[1].slug).not.toBe(upserts[0].slug);
  });

  it("이전 글을 읽지 못하면 새 글로 착각해 저장하지 않는다", async () => {
    signedIn(user({ app: { is_admin: true } }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { service, upserts } = savingService({ category: dev });
    const from = service.from;
    mocks.createServiceClient.mockReturnValue({
      from: (table: string) => {
        const query = from(table);
        const select = query.select;
        query.select = (columns = "") => {
          const selected = select(columns);
          if (columns.startsWith("slug,category_slug")) {
            query.maybeSingle = async () => ({ data: null, error: { message: "boom" } }) as never;
          }
          return selected;
        };
        return query;
      },
    });

    const result = await savePost({ ...blogInput, id: "post-1", slug: "post-abc" });

    expect(result).toEqual({ success: false, error: DB_FAILURE_MESSAGE });
    expect(upserts).toEqual([]);
  });
});

describe("savePost 이미지 버킷", () => {
  beforeEach(() => {
    signedIn(user({ app: { is_admin: true } }));
  });

  it("비공개로 저장하면 공개 버킷의 본문·첨부·썸네일 이미지를 먼저 비공개 버킷으로 옮기고 키를 바꿔 저장한다", async () => {
    const { log, payloads } = imageService();

    const result = await savePost(privateInputWithPublicImages);

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

    await savePost({ type: "feed", content: "오늘\n![](post-images-private:2026-01-03/a.png)" });

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

    await savePost({ ...blogInput, content: "![](post-images-public:2026-01-03/a.png)" });

    expect(log).toEqual(["upsert"]);
  });

  it("하나라도 못 옮기면 옮긴 이미지를 되돌리고 글을 저장하지 않는다", async () => {
    const { log } = imageService({ failMoves: ["post-images-public:2026-01-03/c.png"] });

    const result = await savePost(privateInputWithPublicImages);

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

    const result = await savePost(privateInputWithPublicImages);

    expect(result).toEqual({
      success: false,
      error:
        "이미지를 옮기지 못해 저장하지 않았어요: post-images-public:2026-01-03/c.png 원래 버킷으로 되돌리지 못한 이미지: post-images-private:2026-01-03/a.png",
    });
  });

  it("글 저장이 실패하면 옮긴 이미지를 원래 버킷으로 되돌린다", async () => {
    const { log } = imageService({ failSave: true });

    const result = await savePost(privateInputWithPublicImages);

    expect(log.slice(2)).toEqual([
      "upsert",
      "post-images-private:2026-01-03/a.png → post-images-public:2026-01-03/a.png",
      "post-images-private:2026-01-03/c.png → post-images-public:2026-01-03/c.png",
    ]);
    expect(result).toEqual({ success: false, error: DB_FAILURE_MESSAGE });
  });
});

const deletedWithImages = {
  content: "![](post-images-public:2026-01-03/a.png#w=60)\n![](post-images-private:2026-01-03/b.png)",
  image_keys: ["post-images-public:2026-01-03/c.png"],
  thumbnail_image_key: "post-images-public:2026-01-03/a.png",
};

describe("deletePost 이미지 정리", () => {
  beforeEach(() => {
    signedIn(user({ app: { is_admin: true } }));
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("글을 지운 뒤 그 글이 쓰던 본문·첨부·썸네일 이미지를 두 버킷에서 지운다", async () => {
    const { log } = imageService({ deleted: deletedWithImages });

    expect(await deletePost("post-abc")).toEqual({ success: true });
    expect(log).toEqual([
      "delete",
      "remove post-images-public:2026-01-03/a.png post-images-public:2026-01-03/c.png",
      "remove post-images-private:2026-01-03/b.png",
    ]);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("지우기 전에 다른 글의 본문·첨부·썸네일이 그 키를 쓰는지 묻는다", async () => {
    const { lookups } = imageService({ deleted: deletedWithImages });

    await deletePost("post-abc");

    const keys = [
      "post-images-public:2026-01-03/a.png",
      "post-images-public:2026-01-03/c.png",
      "post-images-private:2026-01-03/b.png",
    ];
    expect(lookups).toEqual([
      ["likeAnyOf", "content", keys.map((key) => `%${key}%`)],
      ["overlaps", "image_keys", keys],
      ["in", "thumbnail_image_key", keys],
    ]);
  });

  it("다른 글이 쓰는 파일은 지우지 않는다", async () => {
    const { log } = imageService({
      deleted: deletedWithImages,
      usedBy: [
        { content: "![](post-images-public:2026-01-03/a.png)", image_keys: null, thumbnail_image_key: null },
        { content: "", image_keys: ["post-images-private:2026-01-03/b.png"], thumbnail_image_key: null },
        // 본문 조건은 글자 포함으로 넓게 거르므로, 이름이 더 긴 파일을 쓰는 글이 같이 올 수 있다.
        { content: "![](post-images-public:2026-01-03/c.png.bak)", image_keys: null, thumbnail_image_key: null },
      ],
    });

    expect(await deletePost("post-abc")).toEqual({ success: true });
    expect(log).toEqual(["delete", "remove post-images-public:2026-01-03/c.png"]);
  });

  it("다른 글이 쓰는지 확인하지 못하면 아무것도 지우지 않고 삭제는 성공으로 돌려준다", async () => {
    const { log } = imageService({ deleted: deletedWithImages, failLookup: true });

    expect(await deletePost("post-abc")).toEqual({ success: true });
    expect(log).toEqual(["delete"]);
    expect(console.error).toHaveBeenCalled();
  });

  it("파일을 지우지 못해도 삭제는 성공으로 돌려주고 지우지 못한 키를 서버 로그에 남긴다", async () => {
    imageService({ deleted: deletedWithImages, failRemove: true });

    expect(await deletePost("post-abc")).toEqual({ success: true });
    expect(console.error).toHaveBeenCalledWith(expect.any(String), "remove failed", [
      "post-images-private:2026-01-03/b.png",
    ]);
  });

  it("이미지가 없는 글은 조회도 Storage도 부르지 않는다", async () => {
    const { log, lookups } = imageService({
      deleted: { content: "![](https://example.com/a.png)", image_keys: [], thumbnail_image_key: null },
    });

    expect(await deletePost("post-abc")).toEqual({ success: true });
    expect(log).toEqual(["delete"]);
    expect(lookups).toEqual([]);
  });

  it("업로드가 만들지 않는 글자(쉼표 등)가 든 키는 다른 글 확인을 믿을 수 없어 지우지 않는다", async () => {
    const { log, lookups } = imageService({
      deleted: { content: "![](post-images-public:2026-01-03/a,b.png)", image_keys: [], thumbnail_image_key: null },
    });

    expect(await deletePost("post-abc")).toEqual({ success: true });
    expect(log).toEqual(["delete"]);
    expect(lookups).toEqual([]);
  });
});

describe("savePost 수정 때 뺀 이미지 정리", () => {
  const previous = {
    content: "![](post-images-public:2026-01-03/a.png)\n![](post-images-public:2026-01-03/b.png)",
    image_keys: ["post-images-public:2026-01-03/c.png"],
    thumbnail_image_key: "post-images-public:2026-01-03/a.png",
  };
  const edit = { ...blogInput, id: "post-1", slug: "post-abc", content: "![](post-images-public:2026-01-03/a.png#w=60)" };

  beforeEach(() => {
    signedIn(user({ app: { is_admin: true } }));
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("저장한 뒤 이전 버전이 쓰던 이미지 중 새 버전에 없는 것만 지운다", async () => {
    const { log } = imageService({ previous });

    const result = await savePost(edit);

    expect(result.success).toBe(true);
    expect(log).toEqual(["upsert", "remove post-images-public:2026-01-03/b.png post-images-public:2026-01-03/c.png"]);
  });

  it("비공개로 바꾸며 버킷만 옮긴 이미지는 지우지 않고, 뺀 이미지만 지금 위치에서 지운다", async () => {
    const { log } = imageService({ previous });

    const result = await savePost({ ...edit, visibility: "private" });

    expect(result.success).toBe(true);
    expect(log).toEqual([
      "post-images-public:2026-01-03/a.png → post-images-private:2026-01-03/a.png",
      "upsert",
      "remove post-images-public:2026-01-03/b.png post-images-public:2026-01-03/c.png",
    ]);
  });

  it("공개로 바꾸며 비공개 버킷에서 옮긴 이미지를 새 버전이 그대로 쓰면 지우지 않는다", async () => {
    const { log } = imageService({
      previous: { content: "![](post-images-private:2026-01-03/a.png)", image_keys: [], thumbnail_image_key: null },
    });

    await savePost({ ...edit, content: "![](post-images-private:2026-01-03/a.png)" });

    expect(log).toEqual(["post-images-private:2026-01-03/a.png → post-images-public:2026-01-03/a.png", "upsert"]);
  });

  it("다른 글이 쓰는 이미지는 수정에서 빼도 지우지 않는다", async () => {
    const { log } = imageService({
      previous,
      usedBy: [{ content: "", image_keys: null, thumbnail_image_key: "post-images-public:2026-01-03/c.png" }],
    });

    await savePost(edit);

    expect(log).toEqual(["upsert", "remove post-images-public:2026-01-03/b.png"]);
  });

  it("저장이 실패하면 이전 이미지를 지우지 않는다", async () => {
    const { log } = imageService({ previous, failSave: true });

    const result = await savePost(edit);

    expect(result).toEqual({ success: false, error: DB_FAILURE_MESSAGE });
    expect(log).toEqual(["upsert"]);
  });

  it("파일을 지우지 못해도 저장은 성공으로 돌려준다", async () => {
    imageService({ previous, failRemove: true });

    const result = await savePost(edit);

    expect(result.success).toBe(true);
    expect(console.error).toHaveBeenCalled();
  });
});

describe("savePost 오래된 화면", () => {
  const OPENED_AT = "2026-11-06T01:00:00.000000+00:00";
  const CHANGED_AT = "2026-11-06T02:00:00.000000+00:00";
  const photo = "post-images-public:2026-01-03/a.png";
  const privatePhoto = "post-images-private:2026-01-03/a.png";
  const edit = { ...blogInput, id: "post-1", slug: "post-abc", content: "옛 본문", baseUpdatedAt: OPENED_AT };

  beforeEach(() => {
    signedIn(user({ app: { is_admin: true } }));
  });

  it("글을 연 뒤 다른 곳에서 고쳤으면 덮어쓰지 않고 그쪽에서 넣은 사진도 지우지 않는다", async () => {
    const { log } = imageService({
      previous: { content: `![](${photo})`, image_keys: [], thumbnail_image_key: null, updated_at: CHANGED_AT },
    });

    expect(await savePost(edit)).toEqual({ success: false, error: POST_CHANGED_ELSEWHERE });
    expect(log).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(mocks.enableDraftMode).not.toHaveBeenCalled();
  });

  it("다른 곳에서 비공개로 바꾼 글을 옛 화면이 공개로 되돌리지 않는다", async () => {
    const { log } = imageService({
      previous: { content: `![](${privatePhoto})`, image_keys: [], thumbnail_image_key: null, updated_at: CHANGED_AT },
    });

    const result = await savePost({ ...edit, visibility: "public", content: `![](${privatePhoto})` });

    expect(result).toEqual({ success: false, error: POST_CHANGED_ELSEWHERE });
    expect(log).toEqual([]);
  });

  it("글을 연 뒤 다른 곳에서 지웠으면 옛 화면이 다시 만들지 않는다", async () => {
    const { log } = imageService();

    expect(await savePost(edit)).toEqual({ success: false, error: POST_CHANGED_ELSEWHERE });
    expect(log).toEqual([]);
  });

  it("글을 연 뒤 바뀌지 않았으면 저장한다", async () => {
    const { log } = imageService({
      previous: { content: "", image_keys: [], thumbnail_image_key: null, updated_at: OPENED_AT },
    });

    expect((await savePost(edit)).success).toBe(true);
    expect(log).toEqual(["upsert"]);
  });
});
