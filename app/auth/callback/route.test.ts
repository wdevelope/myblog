import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/auth/callback/route";

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { exchangeCodeForSession: mocks.exchangeCodeForSession },
  }),
}));

const ORIGIN = "http://localhost:2025";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
});

describe("GET /auth/callback 리다이렉트", () => {
  it("next가 //evil.example이면 같은 출처의 /로 보낸다", async () => {
    const res = await GET(new Request(`${ORIGIN}/auth/callback?code=abc&next=//evil.example`));

    expect(res.headers.get("location")).toBe(`${ORIGIN}/`);
  });

  it("next가 같은 출처 경로면 그 경로로 보낸다", async () => {
    const res = await GET(
      new Request(`${ORIGIN}/auth/callback?code=abc&next=${encodeURIComponent("/article/foo?x=1")}`),
    );

    expect(res.headers.get("location")).toBe(`${ORIGIN}/article/foo?x=1`);
  });
});
