// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import AdminModeSync from "@/app/_components/AdminModeSync";

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

// 세션 조회(getSession)와 그 뒤의 요청이 끝날 때까지 기다린다.
async function settle() {
  await act(async () => {});
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

describe("관리자 화면 맞추기", () => {
  it("화면에 아무것도 그리지 않는다", async () => {
    mocks.session = admin;
    const { container } = render(<AdminModeSync enabled />);
    await settle();
    expect(container).toBeEmptyDOMElement();
  });

  it("세션이 없거나 일반 사용자면 꺼진 상태를 그대로 둔다", async () => {
    render(<AdminModeSync enabled={false} />);
    await settle();
    cleanup();

    mocks.session = member;
    render(<AdminModeSync enabled={false} />);
    await settle();

    expect(mocks.enableAdminMode).not.toHaveBeenCalled();
    expect(mocks.disableAdminMode).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("관리자 세션인데 꺼져 있으면 켜기를 요청한 뒤 화면을 새로 받는다", async () => {
    mocks.session = admin;
    render(<AdminModeSync enabled={false} />);

    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
    expect(mocks.enableAdminMode).toHaveBeenCalledTimes(1);
    expect(mocks.disableAdminMode).not.toHaveBeenCalled();
  });

  it("켜기가 거절되면 알리고 화면을 새로 받지 않는다", async () => {
    mocks.session = admin;
    mocks.enableAdminMode.mockResolvedValue(false);
    render(<AdminModeSync enabled={false} />);

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledTimes(1));
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("서버가 켜짐으로 그렸는데 관리자 세션이 없으면 조용히 끄고 화면을 새로 받는다", async () => {
    render(<AdminModeSync enabled />);

    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
    expect(mocks.disableAdminMode).toHaveBeenCalledTimes(1);
    expect(mocks.enableAdminMode).not.toHaveBeenCalled();
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it("관리자 세션이고 켜져 있으면 아무것도 요청하지 않는다", async () => {
    mocks.session = admin;
    render(<AdminModeSync enabled />);
    await settle();

    expect(mocks.enableAdminMode).not.toHaveBeenCalled();
    expect(mocks.disableAdminMode).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
