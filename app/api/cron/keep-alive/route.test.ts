import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { GET } from "@/app/api/cron/keep-alive/route";

let fetchMock: Mock<typeof fetch>;

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  vi.stubEnv("CRON_SECRET", "cron-secret");
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function cronRequest(authorization?: string) {
  return new Request("https://example.com/api/cron/keep-alive", {
    headers: authorization ? { authorization } : {},
  });
}

describe("Supabase 일시정지 방지 Cron", () => {
  it("CRON_SECRET이 맞지 않으면 401을 돌려주고 DB에 요청하지 않는다", async () => {
    const response = await GET(cronRequest("Bearer wrong"));

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("CRON_SECRET이 설정되지 않았으면 헤더가 비어 있어도 통과시키지 않는다", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const response = await GET(cronRequest("Bearer "));

    expect(response.status).toBe(401);
  });

  it("캐시하지 않는 가벼운 조회 한 번으로 DB 활동을 남긴다", async () => {
    fetchMock.mockResolvedValue(new Response("[]", { status: 200 }));

    const response = await GET(cronRequest("Bearer cron-secret"));

    expect(response.status).toBe(200);
    const [input, init] = fetchMock.mock.calls[0];
    expect(String(input)).toBe("https://project.supabase.co/rest/v1/categories?select=slug&limit=1");
    expect(init).toMatchObject({ cache: "no-store" });
  });

  it("DB에 닿지 못하면 502로 알린다", async () => {
    fetchMock.mockResolvedValue(new Response("down", { status: 503 }));

    const response = await GET(cronRequest("Bearer cron-secret"));

    expect(response.status).toBe(502);
  });
});
