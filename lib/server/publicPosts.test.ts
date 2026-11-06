import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import {
  getPublicCategories,
  getPublicComments,
  getPublicDiaryIndex,
  getPublicPost,
  getPublicPostCounts,
  getPublicPosts,
  revalidatePublicPosts,
} from "@/lib/server/publicPosts";

const mocks = vi.hoisted(() => ({
  serviceSelect: "",
  serviceRows: [] as unknown[],
}));

// unstable_cache는 캐시 없이 함수를 그대로 부르게 한다.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
  unstable_cache: (fn: () => unknown) => fn,
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => {
    const query = {
      select: (columns: string) => ((mocks.serviceSelect = columns), query),
      eq: () => query,
      order: async () => ({ data: mocks.serviceRows, error: null }),
    };
    return { from: () => query };
  },
}));

const ANON_KEY = "test-anon-key";

let fetchMock: Mock<typeof fetch>;

beforeEach(() => {
  // 끝의 /를 붙여 요청 주소에서 지워지는지도 함께 본다.
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co/");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", ANON_KEY);
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), { status: 200, ...init });
}

function requestAt(index = 0) {
  const [input, init] = fetchMock.mock.calls[index];
  return { url: new URL(String(input)), init };
}

const row = {
  id: "p1",
  slug: "hello",
  type: "blog",
  visibility: "public",
  title: "안녕",
  content: "<p>본문</p>",
  category_slug: "dev",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  view_count: 0,
  image_keys: null,
  thumbnail_image_key: null,
  comments: [{ count: 3 }],
};

describe("공개 글 목록 조회", () => {
  it("공개 글만 최신순으로 anon 키를 실어 PostgREST posts에 요청한다", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await getPublicPosts({ type: "feed" });

    const { url, init } = requestAt();
    expect(`${url.origin}${url.pathname}`).toBe("https://project.supabase.co/rest/v1/posts");
    expect(url.searchParams.get("select")).toBe(
      "id,slug,type,visibility,title,content,category_slug,created_at,updated_at,image_keys,thumbnail_image_key,view_count,comments(count)",
    );
    expect(url.searchParams.get("type")).toBe("eq.feed");
    expect(url.searchParams.get("visibility")).toBe("eq.public");
    expect(url.searchParams.get("order")).toBe("created_at.desc");
    expect(url.searchParams.has("category_slug")).toBe(false);
    expect(url.searchParams.has("limit")).toBe(false);
    expect(url.searchParams.has("offset")).toBe(false);
    expect(init).toMatchObject({
      method: "GET",
      cache: "force-cache",
      headers: {
        apikey: ANON_KEY,
        authorization: `Bearer ${ANON_KEY}`,
        accept: "application/json",
        prefer: "count=exact",
      },
    });
  });

  it("글 타입 공개 캐시 태그를 달고 세그먼트와 같은 86400초로 캐시한다", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await getPublicPosts({ type: "feed" });

    expect(requestAt().init).toMatchObject({
      next: { revalidate: 86400, tags: ["posts:public:feed"] },
    });
  });

  it("아티클 카테고리를 주면 카테고리 필터를 더하고 캐시는 아티클 태그로 묶는다", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await getPublicPosts({ type: "blog", category: "dev" });

    const { url, init } = requestAt();
    expect(url.searchParams.get("category_slug")).toBe("eq.dev");
    expect(init).toMatchObject({
      next: { tags: ["posts:public:blog"] },
    });
  });

  it("limit과 page로 offset을 계산해 페이지를 나눈다", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await getPublicPosts({ type: "blog", limit: 10, page: 3 });

    const { url } = requestAt();
    expect(url.searchParams.get("limit")).toBe("10");
    expect(url.searchParams.get("offset")).toBe("20");
  });

  it("page 없이 limit만 주면 offset 없이 개수만 제한한다", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await getPublicPosts({ type: "blog", limit: 5 });

    const { url } = requestAt();
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.has("offset")).toBe(false);
  });

  it("행을 Post로 바꾼다", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        row,
        {
          ...row,
          id: "p2",
          slug: "second",
          category_slug: null,
          updated_at: "2026-01-02T00:00:00Z",
          image_keys: ["post-images-public:a.png"],
          thumbnail_image_key: "post-images-public:a.png",
          comments: undefined,
        },
      ]),
    );

    const { data } = await getPublicPosts({ type: "blog" });

    expect(data).toEqual([
      {
        id: "p1",
        slug: "hello",
        type: "blog",
        visibility: "public",
        title: "안녕",
        content: "<p>본문</p>",
        categorySlug: "dev",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        imageKeys: [],
        thumbnailImageKey: null,
        viewCount: 0,
        commentCount: 3,
      },
      {
        id: "p2",
        slug: "second",
        type: "blog",
        visibility: "public",
        title: "안녕",
        content: "<p>본문</p>",
        categorySlug: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-02T00:00:00Z",
        imageKeys: ["post-images-public:a.png"],
        thumbnailImageKey: "post-images-public:a.png",
        viewCount: 0,
        commentCount: 0,
      },
    ]);
  });

  it("Content-Range 헤더의 전체 개수를 count로 쓴다", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([row], { headers: { "content-range": "0-0/42" } }),
    );

    const { count } = await getPublicPosts({ type: "blog", limit: 1 });

    expect(count).toBe(42);
  });

  it("전체 개수를 알 수 없으면 받은 행 수를 count로 쓴다", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([row, row], { headers: { "content-range": "0-1/*" } }))
      .mockResolvedValueOnce(jsonResponse([row]));

    const unknownTotal = await getPublicPosts({ type: "blog" });
    const noHeader = await getPublicPosts({ type: "blog" });

    expect(unknownTotal.count).toBe(2);
    expect(noHeader.count).toBe(1);
  });

  it("응답이 실패하면 상태 코드와 본문을 담아 throw한다", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));

    await expect(getPublicPosts({ type: "blog" })).rejects.toThrow("Supabase REST 500: boom");
  });
});

describe("카테고리별 공개 글 수", () => {
  it("카테고리마다 해당 타입 공개 글 수를 관계 count로 요청한다", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await getPublicPostCounts("blog");

    const { url, init } = requestAt();
    expect(`${url.origin}${url.pathname}`).toBe("https://project.supabase.co/rest/v1/categories");
    expect(url.searchParams.get("select")).toBe("slug,posts(count)");
    expect(url.searchParams.get("posts.type")).toBe("eq.blog");
    expect(url.searchParams.get("posts.visibility")).toBe("eq.public");
    expect(init).toMatchObject({
      method: "GET",
      headers: { apikey: ANON_KEY, authorization: `Bearer ${ANON_KEY}` },
      next: { tags: ["posts:public:blog"] },
    });
  });

  // total은 카테고리 없는 공개 글을 빼고 세는 알려진 결함이라 고정하지 않는다(로드맵 발견 사항).
  it("카테고리 slug별 공개 글 수를 돌려준다", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        { slug: "dev", posts: [{ count: 3 }] },
        { slug: "life", posts: [{ count: 0 }] },
      ]),
    );

    const { counts } = await getPublicPostCounts("blog");

    expect(counts).toEqual({ dev: 3, life: 0 });
  });

  it("응답이 실패하면 throw하지 않고 빈 결과를 돌려준다", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));

    await expect(getPublicPostCounts("blog")).resolves.toEqual({ counts: {}, total: 0 });
  });
});

describe("revalidatePublicPosts", () => {
  beforeEach(() => {
    vi.mocked(revalidatePath).mockClear();
    vi.mocked(revalidateTag).mockClear();
    vi.mocked(updateTag).mockClear();
  });

  // revalidateTag(tag, profile)는 낡음 표시라 쓴 직후 첫 방문자가 이전 목록을 받는다(로드맵 16절).
  it("태그를 바로 만료해 쓴 직후 첫 방문자도 새 목록을 받게 한다", () => {
    revalidatePublicPosts({ type: "blog" });

    expect(vi.mocked(updateTag).mock.calls).toEqual([["posts:public:blog"]]);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  // 목록 페이지는 (home)·(list) route group 안에 있어 type을 주면 파일 경로 태그와 맞지 않는다.
  it("목록 경로는 type 없이 주소로 무효화한다", () => {
    revalidatePublicPosts({ type: "diary", slugs: ["d1"] });

    expect(vi.mocked(revalidatePath).mock.calls).toEqual([["/"], ["/diary"], ["/diary/d1"]]);
  });

  it("피드는 상세 화면이 없어 목록 경로와 피드 태그만 무효화한다", () => {
    revalidatePublicPosts({ type: "feed", slugs: ["photo"] });

    expect(vi.mocked(revalidatePath).mock.calls).toEqual([["/"], ["/feed"]]);
    expect(vi.mocked(updateTag).mock.calls).toEqual([["posts:public:feed"]]);
  });

  it("같은 slug는 한 번만, 비어 있는 값은 건너뛴다", () => {
    revalidatePublicPosts({ type: "blog", slugs: ["a", "a", null] });

    expect(vi.mocked(updateTag).mock.calls).toEqual([["posts:public:blog"]]);
    expect(vi.mocked(revalidatePath).mock.calls).toEqual([["/"], ["/article"], ["/article/a"]]);
  });
});

describe("공개 글 단건 조회", () => {
  it("경로의 글 타입과 slug로 공개 글 하나를 하루 캐시·타입 태그로 요청한다", async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ ...row, view_count: 12 }]));

    const post = await getPublicPost("blog", "hello");

    const { url, init } = requestAt();
    expect(`${url.origin}${url.pathname}`).toBe("https://project.supabase.co/rest/v1/posts");
    expect(url.searchParams.get("slug")).toBe("eq.hello");
    expect(url.searchParams.get("type")).toBe("eq.blog");
    expect(url.searchParams.get("visibility")).toBe("eq.public");
    expect(url.searchParams.get("limit")).toBe("1");
    expect(init).toMatchObject({ next: { revalidate: 86400, tags: ["posts:public:blog"] } });
    expect(post).toMatchObject({ slug: "hello", commentCount: 3, viewCount: 12 });
  });

  it("없거나 RLS가 가린 글이면 null을 돌려준다", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await expect(getPublicPost("blog", "secret")).resolves.toBeNull();
  });
});

describe("공개 카테고리 조회", () => {
  it("공개 카테고리를 정렬 순서대로 아티클 태그를 달아 요청한다", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        { slug: "dev", sort_order: 1 },
        { slug: "life", sort_order: 2 },
      ]),
    );

    const categories = await getPublicCategories();

    const { url, init } = requestAt();
    expect(`${url.origin}${url.pathname}`).toBe("https://project.supabase.co/rest/v1/categories");
    expect(url.searchParams.get("select")).toBe("slug,sort_order");
    expect(url.searchParams.get("order")).toBe("sort_order.asc,slug.asc");
    expect(init).toMatchObject({ next: { revalidate: 86400, tags: ["posts:public:blog"] } });
    expect(categories).toEqual([
      { slug: "dev", sortOrder: 1 },
      { slug: "life", sortOrder: 2 },
    ]);
  });
});

describe("방문자용 다이어리 목록", () => {
  it("화면이 쓰는 다섯 열만 읽어 그대로 돌려주고 비공개 다이어리 제목은 가린다", async () => {
    mocks.serviceRows = [
      { id: "d1", slug: "open", visibility: "public", title: "공개 일기", created_at: "2026-01-02T00:00:00Z" },
      { id: "d2", slug: "secret", visibility: "private", title: "비밀 제목", created_at: "2026-01-01T00:00:00Z" },
    ];

    const posts = await getPublicDiaryIndex();

    expect(mocks.serviceSelect).toBe("id,slug,title,created_at,visibility");
    expect(posts).toEqual([
      { id: "d1", slug: "open", title: "공개 일기", createdAt: "2026-01-02T00:00:00Z", visibility: "public" },
      { id: "d2", slug: "secret", title: "일기", createdAt: "2026-01-01T00:00:00Z", visibility: "private" },
    ]);
  });
});

describe("공개 댓글 조회", () => {
  it("글의 댓글을 작성 순으로 그 글 타입 태그를 달아 요청하고 Comment로 바꾼다", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        {
          id: "c1",
          post_id: "p1",
          parent_id: null,
          author_id: "u1",
          author_is_admin: true,
          content: "첫 댓글",
          created_at: "2026-01-01T00:00:00Z",
          author: { nickname: "닉네임", avatar_path: "u1/a.jpg" },
        },
        {
          id: "c2",
          post_id: "p1",
          parent_id: null,
          author_id: "u2",
          author_is_admin: false,
          content: "프로필 없는 댓글",
          created_at: "2026-01-02T00:00:00Z",
          author: null,
        },
      ]),
    );

    const comments = await getPublicComments("blog", "p1");

    const { url, init } = requestAt();
    expect(`${url.origin}${url.pathname}`).toBe("https://project.supabase.co/rest/v1/comments");
    expect(url.searchParams.get("select")?.split(",")).toContain("author_is_admin");
    expect(url.searchParams.get("select")).toContain("author:profiles(nickname,avatar_path)");
    expect(url.searchParams.get("post_id")).toBe("eq.p1");
    expect(url.searchParams.get("order")).toBe("created_at.asc");
    expect(init).toMatchObject({ next: { revalidate: 86400, tags: ["posts:public:blog"] } });
    expect(comments).toEqual([
      {
        id: "c1",
        postId: "p1",
        parentId: null,
        authorId: "u1",
        authorIsAdmin: true,
        authorNickname: "닉네임",
        authorAvatarPath: "u1/a.jpg",
        content: "첫 댓글",
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "c2",
        postId: "p1",
        parentId: null,
        authorId: "u2",
        authorIsAdmin: false,
        authorNickname: null,
        authorAvatarPath: null,
        content: "프로필 없는 댓글",
        createdAt: "2026-01-02T00:00:00Z",
      },
    ]);
  });
});

describe("범위를 벗어난 쪽", () => {
  it("PostgREST가 416(Range Not Satisfiable)을 주면 빈 목록과 전체 개수를 돌려준다", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 416, headers: { "content-range": "*/3" } }));

    await expect(getPublicPosts({ type: "blog", page: 2, limit: 12 })).resolves.toEqual({ data: [], count: 3 });
  });
});
