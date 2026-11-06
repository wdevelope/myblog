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
  signIn: vi.fn(),
  signUp: vi.fn(),
  rpc: vi.fn(),
  signInError: null as { code?: string; message: string } | null,
  search: new URLSearchParams(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signInWithPassword: mocks.signIn,
      signUp: mocks.signUp,
    },
    rpc: mocks.rpc,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
  useSearchParams: () => mocks.search,
}));

vi.mock("@/lib/adminMode", () => ({ enableAdminMode: mocks.enableAdminMode }));

// 실제 toast.promise처럼 실패한 promise를 받아 처리해 둔다(처리하지 않으면 테스트가 unhandled rejection으로 끝난다).
vi.mock("sonner", () => ({
  toast: { promise: vi.fn((promise: Promise<unknown>) => void promise.catch(() => {})) },
}));

function fillLogin() {
  fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
    target: { value: "owner@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("8자 이상"), {
    target: { value: "password123" },
  });
}

function submitLogin() {
  fillLogin();
  // 첫 번째 "로그인"은 모드 탭이고 마지막이 제출 버튼이다.
  const buttons = screen.getAllByRole("button", { name: "로그인" });
  fireEvent.click(buttons[buttons.length - 1]);
}

function formOf(input: HTMLElement) {
  const form = input.closest("form");
  if (!form) throw new Error("입력칸을 감싼 form이 없다");
  return form;
}

// jsdom은 Enter로 폼을 제출하지 않는다. 브라우저처럼 폼의 첫 제출 버튼을 누른다.
function pressEnter(input: HTMLElement) {
  const button = formOf(input).querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!button) throw new Error("제출 버튼이 없다");
  fireEvent.click(button);
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
  mocks.signInError = null;
  mocks.search = new URLSearchParams();
  mocks.enableAdminMode.mockResolvedValue(true);
  mocks.signIn.mockImplementation(async () => ({
    data: { user: mocks.user, session: { user: mocks.user } },
    error: mocks.signInError,
  }));
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

describe("폼 제출", () => {
  it("비밀번호 칸에서 Enter를 누르면 로그인한다", async () => {
    mocks.user = { id: "user-1", app_metadata: {} };
    render(<LoginForm />);
    fillLogin();

    pressEnter(screen.getByPlaceholderText("8자 이상"));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/"));
    expect(mocks.signIn).toHaveBeenCalledWith({ email: "owner@example.com", password: "password123" });
  });

  it("로그인이 끝나기 전에는 버튼을 막고 다시 제출해도 요청을 한 번만 보낸다", async () => {
    let finish = () => {};
    mocks.signIn.mockReturnValue(
      new Promise((resolve) => {
        finish = () => resolve({ data: { user: null, session: null }, error: null });
      }),
    );
    render(<LoginForm />);
    fillLogin();
    const password = screen.getByPlaceholderText("8자 이상");

    fireEvent.submit(formOf(password));
    fireEvent.submit(formOf(password));

    expect(mocks.signIn).toHaveBeenCalledTimes(1);
    const buttons = screen.getAllByRole("button", { name: "로그인" });
    const submitButton = buttons[buttons.length - 1];
    expect(submitButton).toBeDisabled();

    finish();
    await waitFor(() => expect(submitButton).toBeEnabled());
  });

  it("입력이 모자라면 제출해도 요청을 보내지 않는다", () => {
    render(<LoginForm />);

    fireEvent.submit(formOf(screen.getByPlaceholderText("8자 이상")));

    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it("로그인에 실패하면 버튼이 풀려 다시 제출할 수 있다", async () => {
    mocks.signInError = { code: "invalid_credentials", message: "Invalid login credentials" };
    render(<LoginForm />);
    submitLogin();

    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledTimes(1));
    const buttons = screen.getAllByRole("button", { name: "로그인" });
    await waitFor(() => expect(buttons[buttons.length - 1]).toBeEnabled());

    fireEvent.click(buttons[buttons.length - 1]);
    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledTimes(2));
  });

  it("가입 화면의 Enter는 중복확인이 아니라 계정 만들기를 누르고, 가입도 한 번만 보낸다", async () => {
    let finish = () => {};
    mocks.signUp.mockReturnValue(
      new Promise((resolve) => {
        finish = () => resolve({ data: { user: null, session: null }, error: null });
      }),
    );
    render(<LoginForm />);
    fillSignup();
    fireEvent.click(screen.getByRole("button", { name: "중복확인" }));
    const create = screen.getByRole("button", { name: "계정 만들기" });
    await waitFor(() => expect(create).toBeEnabled());
    mocks.rpc.mockClear();
    const confirm = screen.getByPlaceholderText("비밀번호를 다시 입력");

    pressEnter(confirm);
    fireEvent.submit(formOf(confirm));

    expect(mocks.signUp).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).not.toHaveBeenCalled();
    finish();
    await waitFor(() => expect(screen.getByText(/가입 확인 이메일을 보냈어요/)).toBeInTheDocument());
  });
});

describe("로그인 실패 문구", () => {
  it("비밀번호가 틀리면 Supabase 영어 문구 대신 한국어로 알린다", async () => {
    mocks.signInError = { code: "invalid_credentials", message: "Invalid login credentials" };
    render(<LoginForm />);

    submitLogin();

    await waitFor(() => expect(toast.promise).toHaveBeenCalled());
    const promise = vi.mocked(toast.promise).mock.lastCall?.[0] as Promise<unknown>;
    await expect(promise).rejects.toThrow("이메일이나 비밀번호가 맞지 않아요.");
  });

  it("메일 링크 처리에 실패해 돌아오면 고정 문구를 보이고 주소의 값은 그대로 보이지 않는다", () => {
    mocks.search = new URLSearchParams("error=<b>임의의 문구</b>");

    render(<LoginForm />);

    expect(screen.getByText("링크를 확인하지 못했어요. 이메일과 비밀번호로 로그인해 보세요.")).toBeInTheDocument();
    expect(screen.queryByText(/임의의 문구/)).not.toBeInTheDocument();
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
