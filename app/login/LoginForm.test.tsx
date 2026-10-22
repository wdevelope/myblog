// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import LoginForm from "@/app/login/LoginForm";

type SignInUser = { id: string; app_metadata: { is_admin?: boolean } };

const mocks = vi.hoisted(() => ({
  user: null as SignInUser | null,
  replace: vi.fn(),
  refresh: vi.fn(),
  enableAdminMode: vi.fn(),
  signUp: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signInWithPassword: async () => ({
        data: { user: mocks.user, session: { user: mocks.user } },
        error: null,
      }),
      signUp: mocks.signUp,
    },
    rpc: mocks.rpc,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/adminMode", () => ({ enableAdminMode: mocks.enableAdminMode }));

// 실제 toast.promise처럼 실패한 promise를 받아 처리해 둔다(처리하지 않으면 테스트가 unhandled rejection으로 끝난다).
vi.mock("sonner", () => ({
  toast: { promise: vi.fn((promise: Promise<unknown>) => void promise.catch(() => {})) },
}));

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

function fillSignup() {
  // 두 번째 "회원가입"은 없다. 탭을 눌러 가입 모드로 바꾼다.
  fireEvent.click(screen.getByRole("button", { name: "회원가입" }));
  fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
    target: { value: "new@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("8자 이상"), {
    target: { value: "password123" },
  });
  fireEvent.change(screen.getByPlaceholderText("비밀번호를 다시 입력"), {
    target: { value: "password123" },
  });
  fireEvent.change(screen.getByLabelText("닉네임"), { target: { value: "새회원" } });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = null;
  mocks.enableAdminMode.mockResolvedValue(true);
  mocks.rpc.mockResolvedValue({ data: "ok", error: null });
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

describe("회원가입 닉네임", () => {
  it("중복확인을 통과해야 계정을 만들 수 있고, 가입 정보에 닉네임을 싣는다", async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: { id: "user-2", app_metadata: {} }, session: { user: {} } },
      error: null,
    });
    render(<LoginForm />);
    fillSignup();

    const create = screen.getByRole("button", { name: "계정 만들기" });
    expect(create).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "중복확인" }));
    await waitFor(() => expect(create).toBeEnabled());

    fireEvent.click(create);
    await waitFor(() => expect(mocks.signUp).toHaveBeenCalled());
    expect(mocks.signUp.mock.calls[0][0]).toMatchObject({
      email: "new@example.com",
      options: { data: { nickname: "새회원" } },
    });
  });

  it("가입 순간 닉네임 제약에 걸리면 다시 시도하라고 안내하고 중복확인을 다시 받는다", async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Database error saving new user" },
    });
    render(<LoginForm />);
    fillSignup();
    fireEvent.click(screen.getByRole("button", { name: "중복확인" }));
    const create = screen.getByRole("button", { name: "계정 만들기" });
    await waitFor(() => expect(create).toBeEnabled());

    fireEvent.click(create);

    await waitFor(() => expect(toast.promise).toHaveBeenCalled());
    const promise = vi.mocked(toast.promise).mock.calls[0][0] as Promise<unknown>;
    await expect(promise).rejects.toThrow("다른 닉네임으로 다시 시도해 주세요.");
    await waitFor(() => expect(create).toBeDisabled());
  });
});
