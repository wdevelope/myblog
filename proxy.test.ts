import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config, proxy } from "@/proxy";

type CookieToSet = { name: string; value: string; options?: object };
type CookieMethods = { setAll: (cookies: CookieToSet[]) => void };

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getClaims: vi.fn(),
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
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: adminUser.id } }, error: null });
  mocks.createServerClient.mockImplementation(() => ({
    auth: { getClaims: mocks.getClaims, getUser: mocks.getUser },
  }));
});

describe("proxy 세션 갱신", () => {
  it("sb- 쿠키가 없으면 Supabase 클라이언트를 만들지 않는다", async () => {
    const res = await proxy(request("theme=dark"));

    expect(mocks.createServerClient).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("sb- 쿠키가 있으면 세션을 확인하되 x-user-* 헤더를 싣지 않는다", async () => {
    const res = await proxy(request("sb-project-auth-token=token"));

    expect(mocks.getClaims).toHaveBeenCalledTimes(1);
    expect([...res.headers.keys()].filter((key) => key.includes("x-user"))).toEqual([]);
  });

  it("Supabase가 갱신한 세션 쿠키를 응답과 이번 요청의 서버 컴포넌트에 넘긴다", async () => {
    mocks.createServerClient.mockImplementation(
      (_url: string, _key: string, options: { cookies: CookieMethods }) => ({
        auth: {
          getClaims: async () => {
            options.cookies.setAll([{ name: "sb-project-auth-token", value: "refreshed" }]);
            return { data: { claims: { sub: adminUser.id } }, error: null };
          },
        },
      }),
    );

    const res = await proxy(request("sb-project-auth-token=token"));

    expect(res.cookies.get("sb-project-auth-token")?.value).toBe("refreshed");
    // Next는 x-middleware-request-* 헤더로 바뀐 요청 헤더를 서버 컴포넌트에 넘긴다.
    expect(res.headers.get("x-middleware-request-cookie")).toBe("sb-project-auth-token=refreshed");
  });

  it("살아 있는 토큰은 Auth 서버 왕복(getUser) 없이 서명만 확인한다", async () => {
    await proxy(request("sb-project-auth-token=token"));

    expect(mocks.getClaims).toHaveBeenCalledTimes(1);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
});

describe("옛 /article 쿼리 주소 리다이렉트", () => {
  function legacy(query: string) {
    return proxy(new NextRequest(`http://localhost:2025/article${query}`));
  }

  it("카테고리·쪽 쿼리를 인코딩한 경로로 308 리다이렉트하고 쿼리는 버린다", async () => {
    const response = await legacy(`?category=${encodeURIComponent("개발")}&page=2`);

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      `http://localhost:2025/article/category/${encodeURIComponent("개발")}/page/2`,
    );
  });

  it("쪽 쿼리만 있으면 /article/page/<n>으로 보낸다", async () => {
    const response = await legacy("?page=3");

    expect(response.headers.get("location")).toBe("http://localhost:2025/article/page/3");
  });

  it("쿼리가 없으면 리다이렉트하지 않는다", async () => {
    const response = await legacy("");

    expect(response.headers.get("location")).toBeNull();
  });
});

describe("proxy 실행 범위(matcher)", () => {
  function runs(url: string, cookies: Record<string, string> = {}) {
    return unstable_doesMiddlewareMatch({ config, url: `http://localhost:2025${url}`, cookies });
  }
  const session = { "sb-project-auth-token": "token" };

  it("세션 쿠키가 없는 방문자의 페이지·화면 전환 요청에는 돌지 않는다", () => {
    expect(runs("/feed")).toBe(false);
    expect(runs("/feed?_rsc=abc")).toBe(false);
    expect(runs("/article/post-1", { theme: "dark" })).toBe(false);
  });

  it("세션 쿠키가 있으면 페이지 요청에서 돈다", () => {
    expect(runs("/feed", session)).toBe(true);
    expect(runs("/feed", { theme: "dark", ...session })).toBe(true);
  });

  it("쪼개진 세션 쿠키(.0)만 있어도 돈다", () => {
    expect(runs("/article", { "sb-project-auth-token.0": "part" })).toBe(true);
  });

  it("세션이 아닌 PKCE 쿠키만 있으면 돌지 않는다", () => {
    expect(runs("/feed", { "sb-project-auth-token-code-verifier": "v" })).toBe(false);
  });

  it("옛 /article 쿼리 주소는 세션 쿠키가 없어도 돈다", () => {
    expect(runs(`/article?category=${encodeURIComponent("개발")}`)).toBe(true);
    expect(runs("/article?page=2")).toBe(true);
  });

  it("정적 파일 요청에는 세션 쿠키가 있어도 돌지 않는다", () => {
    expect(runs("/_next/static/chunks/main.js", session)).toBe(false);
    expect(runs("/site-logo.png", session)).toBe(false);
  });
});
