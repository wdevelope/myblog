// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LogoutButton from "@/app/_components/LogoutButton";

const mocks = vi.hoisted(() => ({
  calls: [] as string[],
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signOut: async () => {
        mocks.calls.push("세션 끊기");
      },
    },
  }),
}));

vi.mock("@/lib/adminMode", () => ({
  disableAdminMode: async () => {
    mocks.calls.push("관리자 화면 끄기");
    return true;
  },
}));

vi.mock("sonner", () => ({ toast: { promise: vi.fn() } }));

afterEach(() => {
  cleanup();
  mocks.calls.length = 0;
  vi.clearAllMocks();
});

describe("로그아웃 버튼", () => {
  it("세션을 끊고 관리자 화면을 끈 뒤 로그인 화면으로 보낸다", async () => {
    render(<LogoutButton />);

    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login"));
    expect(mocks.calls).toEqual(["세션 끊기", "관리자 화면 끄기"]);
    expect(mocks.refresh).toHaveBeenCalled();
  });
});
