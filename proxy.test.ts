import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

type CookieToSet = { name: string; value: string; options?: object };
type CookieMethods = { setAll: (cookies: CookieToSet[]) => void };

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.createServerClient }));

vi.mock("@/lib/supabase/env", () => ({
  getSupabaseEnv: () => ({ url: "https://project.supabase.co", anonKey: "anon" }),
}));

const adminUser = {
  id: "user-1",
  email: "admin@example.com",
  app_metadata: { is_admin: true },
  user_metadata: { is_admin: true },
};

function request(cookie?: string) {
  return new NextRequest("http://localhost:2025/article", {
    headers: cookie ? { cookie } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: adminUser }, error: null });
  mocks.createServerClient.mockImplementation(() => ({ auth: { getUser: mocks.getUser } }));
});

describe("proxy 세션 갱신", () => {
  it("sb- 쿠키가 없으면 Supabase 클라이언트를 만들지 않는다", async () => {
    const res = await proxy(request("theme=dark"));

    expect(mocks.createServerClient).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("sb- 쿠키가 있으면 세션을 확인하되 x-user-* 헤더를 싣지 않는다", async () => {
    const res = await proxy(request("sb-project-auth-token=token"));

    expect(mocks.getUser).toHaveBeenCalledTimes(1);
    expect([...res.headers.keys()].filter((key) => key.includes("x-user"))).toEqual([]);
  });

  it("Supabase가 갱신한 세션 쿠키를 응답과 이번 요청의 서버 컴포넌트에 넘긴다", async () => {
    mocks.createServerClient.mockImplementation(
      (_url: string, _key: string, options: { cookies: CookieMethods }) => ({
        auth: {
          getUser: async () => {
            options.cookies.setAll([{ name: "sb-project-auth-token", value: "refreshed" }]);
            return { data: { user: adminUser }, error: null };
          },
        },
      }),
    );

    const res = await proxy(request("sb-project-auth-token=token"));

    expect(res.cookies.get("sb-project-auth-token")?.value).toBe("refreshed");
    // Next는 x-middleware-request-* 헤더로 바뀐 요청 헤더를 서버 컴포넌트에 넘긴다.
    expect(res.headers.get("x-middleware-request-cookie")).toBe("sb-project-auth-token=refreshed");
  });
});
