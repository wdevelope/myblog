// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginForm from "@/app/login/LoginForm";

type SignInUser = { id: string; app_metadata: { is_admin?: boolean } };

const mocks = vi.hoisted(() => ({
  user: null as SignInUser | null,
  replace: vi.fn(),
  refresh: vi.fn(),
  enableAdminMode: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signInWithPassword: async () => ({
        data: { user: mocks.user, session: { user: mocks.user } },
        error: null,
      }),
    },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/adminMode", () => ({ enableAdminMode: mocks.enableAdminMode }));

vi.mock("sonner", () => ({ toast: { promise: vi.fn() } }));

function submitLogin() {
  fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
    target: { value: "owner@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("8자 이상"), {
    target: { value: "password123" },
  });
  // 첫 번째 "로그인"은 모드 탭이고 마지막이 제출 버튼이다.
  const buttons = screen.getAllByRole("button", { name: "로그인" });
  fireEvent.click(buttons[buttons.length - 1]);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = null;
  mocks.enableAdminMode.mockResolvedValue(true);
});

// vitest globals가 꺼져 있어 Testing Library가 자동으로 정리하지 않는다.
afterEach(cleanup);

describe("로그인 폼", () => {
  it("관리자가 로그인하면 관리자 화면을 켠 뒤 이동한다", async () => {
    mocks.user = { id: "admin-1", app_metadata: { is_admin: true } };
    render(<LoginForm />);
    submitLogin();

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/"));
    expect(mocks.enableAdminMode).toHaveBeenCalledTimes(1);
    expect(mocks.enableAdminMode.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.replace.mock.invocationCallOrder[0]
    );
  });

  it("일반 사용자가 로그인하면 관리자 화면을 켜지 않는다", async () => {
    mocks.user = { id: "user-1", app_metadata: {} };
    render(<LoginForm />);
    submitLogin();

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/"));
    expect(mocks.enableAdminMode).not.toHaveBeenCalled();
  });

  it("관리자 화면을 켜지 못해도 로그인한 채 이동한다", async () => {
    mocks.user = { id: "admin-1", app_metadata: { is_admin: true } };
    mocks.enableAdminMode.mockResolvedValue(false);
    render(<LoginForm />);
    submitLogin();

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/"));
    expect(mocks.refresh).toHaveBeenCalled();
  });
});
