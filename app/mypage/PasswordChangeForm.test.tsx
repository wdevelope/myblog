// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PasswordChangeForm from "@/app/mypage/PasswordChangeForm";

const mocks = vi.hoisted(() => ({
  updateUser: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: { updateUser: mocks.updateUser },
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}));

beforeEach(() => {
  mocks.updateUser.mockReset();
});

// vitest globals가 꺼져 있어 Testing Library가 자동으로 정리하지 않는다.
afterEach(cleanup);

function fill(password: string, confirm: string) {
  fireEvent.change(screen.getByLabelText("새 비밀번호"), { target: { value: password } });
  fireEvent.change(screen.getByLabelText("새 비밀번호 확인"), { target: { value: confirm } });
}

describe("비밀번호 변경", () => {
  it("8자 미만이거나 확인이 다르면 바꿀 수 없다", () => {
    render(<PasswordChangeForm />);
    const submit = screen.getByRole("button", { name: "비밀번호 변경" });

    fill("short", "short");
    expect(submit).toBeDisabled();

    fill("password123", "password124");
    expect(submit).toBeDisabled();
    expect(screen.getByText("비밀번호가 일치하지 않습니다.")).toBeInTheDocument();
  });

  it("바꾸면 입력을 비우고, Auth 오류는 한국어로 보인다", async () => {
    mocks.updateUser.mockResolvedValueOnce({ data: {}, error: null });
    render(<PasswordChangeForm />);

    fill("password123", "password123");
    fireEvent.click(screen.getByRole("button", { name: "비밀번호 변경" }));

    await waitFor(() => expect(screen.getByLabelText("새 비밀번호")).toHaveValue(""));
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: "password123" });

    mocks.updateUser.mockResolvedValueOnce({
      data: {},
      error: { code: "same_password", message: "New password should be different from the old password." },
    });
    fill("password123", "password123");
    fireEvent.click(screen.getByRole("button", { name: "비밀번호 변경" }));

    expect(await screen.findByText("지금 쓰는 비밀번호와 다른 비밀번호를 입력해 주세요.")).toBeInTheDocument();
  });
});
