// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MyPage from "@/app/mypage/page";

const viewer = vi.hoisted(() => ({ isAdmin: false }));

vi.mock("@/lib/server/admin", () => ({
  requireLogin: async () => ({
    id: "user-1234",
    email: "user@example.test",
    created_at: "2026-10-22T00:00:00Z",
  }),
  getViewer: async () => viewer,
}));

vi.mock("@/lib/server/account", () => ({
  getMyComments: async () => [],
  getMyProfile: async () => ({ nickname: "오웬친구", avatarPath: null }),
}));

vi.mock("@/app/_components/LogoutButton", () => ({ default: () => null }));
vi.mock("@/app/mypage/MyCommentList", () => ({ default: () => null }));
vi.mock("@/app/mypage/NicknameForm", () => ({ default: () => null }));
vi.mock("@/app/mypage/AvatarForm", () => ({ default: () => null }));
vi.mock("@/app/mypage/PasswordChangeForm", () => ({ default: () => null }));
vi.mock("@/app/mypage/DeleteAccountButton", () => ({ default: () => null }));

afterEach(() => {
  cleanup();
});

async function renderAs(isAdmin: boolean) {
  viewer.isAdmin = isAdmin;
  render(await MyPage());
}

describe("마이페이지", () => {
  it("관리자는 닉네임과 상관없이 Owen·로고·관리자 배지로 보이고 프로필 수정과 탈퇴가 없다", async () => {
    await renderAs(true);

    const avatar = screen.getByRole("img", { name: "Owen" });
    expect(avatar.querySelector("img")?.getAttribute("src")).toContain("logo.png");
    expect(screen.getByText("관리자")).toBeTruthy();
    expect(screen.queryByText("오웬친구")).toBeNull();
    expect(screen.queryByRole("heading", { name: "프로필" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "회원 탈퇴" })).toBeNull();
  });

  it("일반 사용자는 닉네임으로 보이고 프로필 수정과 탈퇴가 있으며 관리자 배지가 없다", async () => {
    await renderAs(false);

    expect(screen.getByRole("img", { name: "오웬친구" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "프로필" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "회원 탈퇴" })).toBeTruthy();
    expect(screen.queryByText("관리자")).toBeNull();
  });
});
