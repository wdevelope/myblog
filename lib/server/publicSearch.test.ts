import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { buildSearchFilter } from "@/lib/search";
import { searchPublicArticles } from "@/lib/server/publicSearch";

// publicPosts.ts(캐시 태그 이름)가 불러오는 next/cache를 막는다.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
  unstable_cache: (fn: () => unknown) => fn,
}));

const ANON_KEY = "test-anon-key";

let fetchMock: Mock<typeof fetch>;

beforeEach(() => {
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
  title: "리액트 훅",
  content: "본문",
  category_slug: "dev",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: null,
  image_keys: ["post-images-public:a.png"],
  thumbnail_image_key: null,
  comments: [{ count: 2 }],
};

describe("공개 아티클 검색", () => {
  it("빈 검색어나 공백뿐인 검색어는 요청하지 않고 빈 목록이다", async () => {
    await expect(searchPublicArticles("")).resolves.toEqual([]);
    await expect(searchPublicArticles("  \n ")).resolves.toEqual([]);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("공개 아티클 조건을 항상 걸고 정리한 검색어로 제목·본문을 최신순 50개까지 찾는다", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await searchPublicArticles("  리액트  ");

    const { url } = requestAt();
    expect(`${url.origin}${url.pathname}`).toBe("https://project.supabase.co/rest/v1/posts");
    expect(url.searchParams.get("select")).toBe(
      "id,slug,type,visibility,title,content,category_slug,created_at,updated_at,image_keys,thumbnail_image_key,view_count,comments(count)",
    );
    expect(url.searchParams.getAll("type")).toEqual(["eq.blog"]);
    expect(url.searchParams.getAll("visibility")).toEqual(["eq.public"]);
    expect(url.searchParams.get("or")).toBe(buildSearchFilter("리액트"));
    expect(url.searchParams.get("order")).toBe("created_at.desc");
    expect(url.searchParams.get("limit")).toBe("50");
  });

  it("검색어에 쿼리 문자열을 넣어도 공개·아티클 조건이 바뀌지 않는다", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await searchPublicArticles("a&visibility=eq.private&type=eq.diary");

    const { url } = requestAt();
    expect(url.searchParams.getAll("type")).toEqual(["eq.blog"]);
    expect(url.searchParams.getAll("visibility")).toEqual(["eq.public"]);
    expect(url.searchParams.get("or")).toBe(buildSearchFilter("a&visibility=eq.private&type=eq.diary"));
  });

  it("anon 키로 요청하고 아티클 공개 캐시 태그를 달아 하루 캐시한다", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await searchPublicArticles("리액트");

    expect(requestAt().init).toMatchObject({
      method: "GET",
      cache: "force-cache",
      headers: {
        apikey: ANON_KEY,
        authorization: `Bearer ${ANON_KEY}`,
        accept: "application/json",
      },
      next: { revalidate: 86400, tags: ["posts:public:blog"] },
    });
  });

  it("행을 Post로 바꾼다", async () => {
    fetchMock.mockResolvedValue(jsonResponse([row]));

    await expect(searchPublicArticles("리액트")).resolves.toEqual([
      {
        id: "p1",
        slug: "hello",
        type: "blog",
        visibility: "public",
        title: "리액트 훅",
        content: "본문",
        categorySlug: "dev",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        imageKeys: ["post-images-public:a.png"],
        thumbnailImageKey: null,
        commentCount: 2,
      },
    ]);
  });

  it("응답이 실패하면 상태 코드와 본문을 담아 throw한다", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 400 }));

    await expect(searchPublicArticles("리액트")).rejects.toThrow("Supabase REST 400: boom");
  });
});
