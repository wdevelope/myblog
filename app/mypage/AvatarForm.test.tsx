// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import AvatarForm from "@/app/mypage/AvatarForm";
import { removeAvatar, updateAvatar } from "@/lib/actions/profile";
import { ACTION_FAILED } from "@/lib/constants";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock("@/lib/actions/profile", () => ({ removeAvatar: vi.fn(), updateAvatar: vi.fn() }));

vi.mock("@/app/_components/useMyProfile", () => ({ notifyProfileChanged: vi.fn() }));

vi.mock("@/app/mypage/toAvatarJpeg", () => ({ toAvatarJpeg: async () => new Blob(["jpeg"]) }));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    storage: { from: () => ({ upload: async () => ({ error: null }) }) },
  }),
}));

beforeEach(() => {
  vi.mocked(toast.error).mockClear();
});

// vitest globals가 꺼져 있어 Testing Library가 자동으로 정리하지 않는다.
afterEach(cleanup);

describe("프로필 사진", () => {
  it("저장 요청이 끊겨도 화면이 유지되고 토스트로 알린다", async () => {
    vi.mocked(updateAvatar).mockRejectedValue(new TypeError("Failed to fetch"));
    render(<AvatarForm userId="u1" hasAvatar={false} />);

    fireEvent.change(screen.getByLabelText("프로필 사진 파일"), {
      target: { files: [new File(["x"], "a.png", { type: "image/png" })] },
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(ACTION_FAILED.error));
    expect(await screen.findByRole("button", { name: "사진 바꾸기" })).toBeInTheDocument();
  });

  it("지우기 요청이 끊겨도 화면이 유지되고 토스트로 알린다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(removeAvatar).mockRejectedValue(new TypeError("Failed to fetch"));
    render(<AvatarForm userId="u1" hasAvatar />);

    fireEvent.click(screen.getByRole("button", { name: "사진 지우기" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(ACTION_FAILED.error));
    expect(await screen.findByRole("button", { name: "사진 지우기" })).toBeInTheDocument();
  });
});
