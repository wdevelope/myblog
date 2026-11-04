import { describe, expect, it } from "vitest";
import { formatPostDate, toDiaryTitle, userDisplayName } from "@/lib/utils";

describe("formatPostDate", () => {
  it("UTC로는 전날이어도 한국 시간 날짜로 보인다", () => {
    // 한국 시간 2026-01-08 01:30
    expect(formatPostDate("2026-01-07T16:30:00Z")).toBe("2026-01-08");
  });

  it("상세 화면용 한국식 표기도 한국 시간 기준이다", () => {
    expect(formatPostDate("2026-01-07T16:30:00Z", "ko")).toBe("2026. 1. 8.");
  });
});

describe("toDiaryTitle", () => {
  it("날짜로 제목을 만든다", () => {
    expect(toDiaryTitle("2026-11-04")).toBe("2026년 11월 4일의 기록");
  });

  it("한 자리 월·일 앞에 0을 붙이지 않는다", () => {
    expect(toDiaryTitle("2026-01-08")).toBe("2026년 1월 8일의 기록");
  });
});

describe("userDisplayName", () => {
  it("관리자는 Owen, 다른 사용자는 id 앞 6자로 부른다", () => {
    expect(userDisplayName("d45e30c8-a9f3", true)).toBe("Owen");
    expect(userDisplayName("8353737f-5798", false)).toBe("사용자 835373");
    expect(userDisplayName(null, false)).toBe("사용자");
  });

  it("닉네임이 있으면 닉네임으로 부르지만 관리자는 Owen 그대로다", () => {
    expect(userDisplayName("8353737f-5798", false, "테스트회원")).toBe("테스트회원");
    expect(userDisplayName("d45e30c8-a9f3", true, "다른이름")).toBe("Owen");
  });
});
