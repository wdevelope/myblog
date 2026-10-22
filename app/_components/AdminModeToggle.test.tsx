// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminModeToggle from "@/app/_components/AdminModeToggle";

type SessionUser = { id: string; app_metadata: { is_admin?: boolean } };

const mocks = vi.hoisted(() => ({
  session: null as { user: SessionUser } | null,
  refresh: vi.fn(),
  enableAdminMode: vi.fn(),
  disableAdminMode: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: mocks.session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/lib/adminMode", () => ({
  enableAdminMode: mocks.enableAdminMode,
  disableAdminMode: mocks.disableAdminMode,
}));

vi.mock("sonner", () => ({ toast: { error: mocks.toastError } }));

const admin = { user: { id: "admin-1", app_metadata: { is_admin: true } } };
const member = { user: { id: "user-1", app_metadata: {} } };

// 세션 조회(getSession)가 끝날 때까지 기다린다.
async function settle() {
  await act(async () => {});
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session = null;
  mocks.enableAdminMode.mockResolvedValue(true);
  mocks.disableAdminMode.mockResolvedValue(true);
});

// vitest globals가 꺼져 있어 Testing Library가 자동으로 정리하지 않는다.
afterEach(cleanup);

describe("관리자 화면 토글", () => {
  it("세션이 없거나 일반 사용자면 그리지 않는다", async () => {
    render(<AdminModeToggle enabled={false} />);
    await settle();
    expect(screen.queryByRole("button", { name: "관리자 화면" })).not.toBeInTheDocument();
    cleanup();

    mocks.session = member;
    render(<AdminModeToggle enabled={false} />);
    await settle();
    expect(screen.queryByRole("button", { name: "관리자 화면" })).not.toBeInTheDocument();
  });

  it("꺼져 있을 때 누르면 켜기를 요청한 뒤 화면을 새로 받는다", async () => {
    mocks.session = admin;
    render(<AdminModeToggle enabled={false} />);

    const button = await screen.findByRole("button", { name: "관리자 화면" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button);

    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
    expect(mocks.enableAdminMode).toHaveBeenCalledTimes(1);
    expect(mocks.disableAdminMode).not.toHaveBeenCalled();
  });

  it("켜져 있으면 눌림 상태이고, 누르면 끄기를 요청한 뒤 화면을 새로 받는다", async () => {
    mocks.session = admin;
    render(<AdminModeToggle enabled />);

    const button = await screen.findByRole("button", { name: "관리자 화면" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(button);

    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
    expect(mocks.disableAdminMode).toHaveBeenCalledTimes(1);
    expect(mocks.enableAdminMode).not.toHaveBeenCalled();
  });

  it("켜기가 거절되면 알리고 화면을 새로 받지 않는다", async () => {
    mocks.session = admin;
    mocks.enableAdminMode.mockResolvedValue(false);
    render(<AdminModeToggle enabled={false} />);

    fireEvent.click(await screen.findByRole("button", { name: "관리자 화면" }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledTimes(1));
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("서버가 켜짐으로 그렸는데 관리자 세션이 없으면 조용히 끄고 화면을 새로 받는다", async () => {
    render(<AdminModeToggle enabled />);

    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
    expect(mocks.disableAdminMode).toHaveBeenCalledTimes(1);
    expect(mocks.toastError).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "관리자 화면" })).not.toBeInTheDocument();
  });

  it("관리자 세션이 있으면 켜진 상태를 그대로 둔다", async () => {
    mocks.session = admin;
    render(<AdminModeToggle enabled />);

    await screen.findByRole("button", { name: "관리자 화면" });
    expect(mocks.disableAdminMode).not.toHaveBeenCalled();
  });
});
