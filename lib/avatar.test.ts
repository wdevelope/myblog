import { afterEach, describe, expect, it, vi } from "vitest";
import { avatarSrc, isOwnAvatarPath, squareCropRect } from "@/lib/avatar";

const USER_ID = "8353737f-5798-4b26-83b8-64cb7ab94240";
const FILE = "11111111-2222-3333-4444-555555555555.jpg";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("프로필 사진 자르기 영역", () => {
  it("가로로 긴 사진은 가운데 정사각형을 고른다", () => {
    expect(squareCropRect(400, 300)).toEqual({ sx: 50, sy: 0, size: 300 });
  });

  it("세로로 긴 사진은 가운데 정사각형을 고른다", () => {
    expect(squareCropRect(300, 500)).toEqual({ sx: 0, sy: 100, size: 300 });
  });

  it("홀수 차이는 정수 좌표로 내린다", () => {
    expect(squareCropRect(301, 300)).toEqual({ sx: 0, sy: 0, size: 300 });
  });
});

describe("프로필 사진 경로", () => {
  it("본인 폴더의 uuid JPEG만 받는다(DB 제약과 같다)", () => {
    expect(isOwnAvatarPath(USER_ID, `${USER_ID}/${FILE}`)).toBe(true);
    expect(isOwnAvatarPath(USER_ID, `d45e30c8-a9f3-4701-b36f-913db3fd1500/${FILE}`)).toBe(false);
    expect(isOwnAvatarPath(USER_ID, `${USER_ID}/evil.svg`)).toBe(false);
    expect(isOwnAvatarPath(USER_ID, `${USER_ID}/../${FILE}`)).toBe(false);
    expect(isOwnAvatarPath(USER_ID, `${USER_ID}/${FILE}x`)).toBe(false);
  });

  it("공개 버킷 주소를 만들고, 경로가 없으면 null이다", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");

    expect(avatarSrc(`${USER_ID}/${FILE}`)).toBe(
      `https://project.supabase.co/storage/v1/object/public/avatars/${USER_ID}/${FILE}`,
    );
    expect(avatarSrc(null)).toBeNull();
  });
});
