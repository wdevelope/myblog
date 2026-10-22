// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import UserAvatar from "@/app/_components/UserAvatar";

const PHOTO = "https://project.supabase.co/storage/v1/object/public/avatars/u1/a.jpg";

// vitest globals가 꺼져 있어 Testing Library가 자동으로 정리하지 않는다.
afterEach(cleanup);

function imageSrc(label: string) {
  const img = screen.getByRole("img", { name: label }).querySelector("img");
  return img ? decodeURIComponent(img.getAttribute("src") ?? "") : null;
}

describe("아바타", () => {
  it("관리자는 사진이 있어도 오웬 로고다", () => {
    render(<UserAvatar isAdmin label="Owen" src={PHOTO} />);

    expect(imageSrc("Owen")).toContain("/logo.png");
  });

  it("사진이 있는 사용자는 그 사진이다", () => {
    render(<UserAvatar isAdmin={false} label="테스트회원" src={PHOTO} />);

    expect(imageSrc("테스트회원")).toContain(PHOTO);
  });

  it("사진이 없으면 사람 아이콘이다", () => {
    render(<UserAvatar isAdmin={false} label="사용자 u1" src={null} />);

    expect(imageSrc("사용자 u1")).toBeNull();
    expect(screen.getByRole("img", { name: "사용자 u1" }).querySelector("svg")).not.toBeNull();
  });
});
