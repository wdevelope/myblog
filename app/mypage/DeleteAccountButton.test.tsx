// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import DeleteAccountButton from "@/app/mypage/DeleteAccountButton";
import { deleteAccount } from "@/lib/actions/account";
import { ACTION_FAILED } from "@/lib/constants";

const mocks = vi.hoisted(() => ({ signOut: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock("@/lib/actions/account", () => ({ deleteAccount: vi.fn() }));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signOut: mocks.signOut } }),
}));

// vitest globals가 꺼져 있어 Testing Library가 자동으로 정리하지 않는다.
afterEach(cleanup);

describe("회원 탈퇴", () => {
  it("요청이 끊겨도 화면이 유지되고 토스트로 알리며 로그아웃하지 않는다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(deleteAccount).mockRejectedValue(new TypeError("Failed to fetch"));
    render(<DeleteAccountButton />);

    fireEvent.click(screen.getByRole("button", { name: "회원 탈퇴" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(ACTION_FAILED.error));
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(await screen.findByRole("button", { name: "회원 탈퇴" })).toBeInTheDocument();
  });
});
