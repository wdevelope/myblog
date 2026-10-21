import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { getPublicPostCounts, getPublicPosts } from "@/lib/server/publicPosts";

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
  updated_at: null,
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
      "id,slug,type,visibility,title,content,category_slug,created_at,updated_at,image_keys,thumbnail_image_key,comments(count)",
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

  // 기본 재검증 주기(60초)는 세그먼트(86400초)와 어긋나는 알려진 결함이라 고정하지 않는다(로드맵 5단계).
  it("글 타입 공개 캐시 태그를 달고 넘겨받은 재검증 주기를 쓴다", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await getPublicPosts({ type: "feed", revalidateSeconds: 86400 });

    expect(requestAt().init).toMatchObject({
      next: { revalidate: 86400, tags: ["posts:public:feed"] },
    });
  });

  it("아티클 카테고리를 주면 카테고리 필터와 카테고리 캐시 태그를 더한다", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await getPublicPosts({ type: "blog", category: "dev" });

    const { url, init } = requestAt();
    expect(url.searchParams.get("category_slug")).toBe("eq.dev");
    expect(init).toMatchObject({
      next: { tags: ["posts:public:blog", "posts:public:blog:category:dev"] },
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
