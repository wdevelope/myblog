import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import { assertAdmin, getViewer, requireAdmin } from "@/lib/server/admin";

const mocks = vi.hoisted(() => ({
  requestHeaders: new Headers(),
  getUser: vi.fn(),
  usersRow: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/headers", () => ({
  headers: async () => mocks.requestHeaders,
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.usersRow }) }),
    }),
  }),
}));

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
    app_metadata: {},
    user_metadata: {},
    ...overrides,
  };
}

function signedIn(user: User | null) {
  mocks.getUser.mockResolvedValue({ data: { user }, error: null });
}

function usersTableIsAdmin(isAdmin: boolean) {
  mocks.usersRow.mockResolvedValue({ data: { is_admin: isAdmin }, error: null });
}

function spoofAdminHeaders() {
  mocks.requestHeaders.set("x-user-id", "attacker");
  mocks.requestHeaders.set("x-user-email", "attacker@example.com");
  mocks.requestHeaders.set("x-user-is-admin", "true");
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of [...mocks.requestHeaders.keys()]) {
    mocks.requestHeaders.delete(key);
  }
  usersTableIsAdmin(false);
});

describe("getViewer", () => {
  it("세션 없이 위조한 x-user-* 요청 헤더만 있으면 비로그인·비관리자다", async () => {
    spoofAdminHeaders();
    signedIn(null);

    expect(await getViewer()).toEqual({ user: null, isAdmin: false });
  });

  it("user_metadata.is_admin만 true인 사용자는 관리자가 아니다", async () => {
    const user = makeUser({ user_metadata: { is_admin: true } });
    signedIn(user);

    expect(await getViewer()).toEqual({ user, isAdmin: false });
  });

  it("app_metadata.is_admin이 true인 사용자는 관리자다", async () => {
    const user = makeUser({ app_metadata: { is_admin: true } });
    signedIn(user);

    expect(await getViewer()).toEqual({ user, isAdmin: true });
  });

  it("users 테이블의 is_admin이 true인 사용자는 관리자다", async () => {
    const user = makeUser();
    signedIn(user);
    usersTableIsAdmin(true);

    expect(await getViewer()).toEqual({ user, isAdmin: true });
  });
});

describe("assertAdmin", () => {
  it("비로그인 요청은 위조 헤더가 있어도 실패한다", async () => {
    spoofAdminHeaders();
    signedIn(null);

    expect(await assertAdmin()).toBeNull();
  });

  it("관리자가 아닌 로그인 사용자는 실패한다", async () => {
    signedIn(makeUser({ user_metadata: { is_admin: true } }));

    expect(await assertAdmin()).toBeNull();
  });

  it("관리자는 사용자를 돌려받는다", async () => {
    const user = makeUser({ app_metadata: { is_admin: true } });
    signedIn(user);

    expect(await assertAdmin()).toEqual(user);
  });
});

describe("requireAdmin", () => {
  it("비로그인이면 돌아올 경로를 담아 로그인 화면으로 보낸다", async () => {
    signedIn(null);

    await expect(requireAdmin("/article/write")).rejects.toThrow(
      "NEXT_REDIRECT:/login?from=%2Farticle%2Fwrite",
    );
  });

  it("관리자가 아니면 홈으로 보낸다", async () => {
    signedIn(makeUser());

    await expect(requireAdmin("/article/write")).rejects.toThrow("NEXT_REDIRECT:/");
  });
});
