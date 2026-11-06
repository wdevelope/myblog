// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import NicknameForm from "@/app/mypage/NicknameForm";
import { updateNickname } from "@/lib/actions/profile";
import { ACTION_FAILED } from "@/lib/constants";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock("@/lib/actions/profile", () => ({ updateNickname: vi.fn() }));

vi.mock("@/app/_components/useMyProfile", () => ({ notifyProfileChanged: vi.fn() }));

vi.mock("@/app/_components/NicknameField", () => ({
  default: ({ onChange, onVerified }: { onChange: (value: string) => void; onVerified: (value: string) => void }) => (
    <button
      type="button"
      onClick={() => {
        onChange("새이름");
        onVerified("새이름");
      }}
    >
      중복확인
    </button>
  ),
}));

// vitest globals가 꺼져 있어 Testing Library가 자동으로 정리하지 않는다.
afterEach(cleanup);

describe("닉네임 저장", () => {
  it("요청이 끊겨도 화면이 유지되고 토스트로 알린다", async () => {
    vi.mocked(updateNickname).mockRejectedValue(new TypeError("Failed to fetch"));
    render(<NicknameForm current="옛이름" />);

    fireEvent.click(screen.getByRole("button", { name: "중복확인" }));
    fireEvent.click(screen.getByRole("button", { name: "닉네임 저장" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(ACTION_FAILED.error));
    expect(screen.getByRole("button", { name: "닉네임 저장" })).toBeInTheDocument();
  });
});
