import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/views/route";

const mocks = vi.hoisted(() => ({
  draftEnabled: false,
  getPublicPost: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("next/headers", () => ({
  draftMode: async () => ({ isEnabled: mocks.draftEnabled }),
}));

vi.mock("@/lib/server/publicPosts", () => ({ getPublicPost: mocks.getPublicPost }));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({ rpc: mocks.rpc }),
}));

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

function viewRequest(body: unknown, userAgent: string | null = BROWSER_UA) {
  return new Request("http://localhost/api/views", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(userAgent ? { "user-agent": userAgent } : null),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.draftEnabled = false;
  mocks.getPublicPost.mockResolvedValue({ id: "p1", slug: "post-abc123", type: "blog", visibility: "public" });
  mocks.rpc.mockResolvedValue({ data: 8, error: null });
});

describe("아티클 조회수 올리기", () => {
  it("공개 아티클이면 조회수 함수를 부르고 센 뒤의 수를 돌려준다", async () => {
    const response = await POST(viewRequest({ slug: "post-abc123" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ viewCount: 8 });
    expect(mocks.getPublicPost).toHaveBeenCalledWith("blog", "post-abc123");
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("increment_post_view", { p_slug: "post-abc123" });
  });

  it("비공개·없는 글이면 같은 404이고 조회수 함수를 부르지 않는다", async () => {
    mocks.getPublicPost.mockResolvedValue(null);

    const hidden = await POST(viewRequest({ slug: "post-secret" }));
    const missing = await POST(viewRequest({ slug: "post-nothing" }));

    expect(hidden.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(await hidden.json()).toEqual(await missing.json());
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["slug가 없음", {}],
    ["slug가 문자열이 아님", { slug: 1 }],
    ["빈 slug", { slug: "" }],
    ["허용하지 않는 문자", { slug: "post-1,slug.eq.x" }],
    ["너무 긴 slug", { slug: "a".repeat(101) }],
    ["JSON이 아닌 본문", "not-json"],
  ])("잘못된 요청(%s)이면 400이고 글을 찾지 않는다", async (_, body) => {
    const response = await POST(viewRequest(body));

    expect(response.status).toBe(400);
    expect(mocks.getPublicPost).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("관리자 화면(draft mode)에서 본 것은 세지 않는다", async () => {
    mocks.draftEnabled = true;

    const response = await POST(viewRequest({ slug: "post-abc123" }));

    expect(response.status).toBe(204);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["검색 봇", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"],
    ["User-Agent 없음", null],
  ])("%s이면 세지 않는다", async (_, userAgent) => {
    const response = await POST(viewRequest({ slug: "post-abc123" }, userAgent));

    expect(response.status).toBe(204);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("조회수 함수가 실패하면 502를 돌려준다", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "boom" } });

    const response = await POST(viewRequest({ slug: "post-abc123" }));

    expect(response.status).toBe(502);
  });

  it("어떤 결과든 응답을 캐시하지 않게 한다", async () => {
    const counted = await POST(viewRequest({ slug: "post-abc123" }));
    const invalid = await POST(viewRequest({ slug: "" }));
    mocks.getPublicPost.mockResolvedValue(null);
    const notFound = await POST(viewRequest({ slug: "post-secret" }));
    mocks.draftEnabled = true;
    const skipped = await POST(viewRequest({ slug: "post-abc123" }));

    for (const response of [counted, invalid, notFound, skipped]) {
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
  });
});
