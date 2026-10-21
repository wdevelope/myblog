import { describe, expect, it } from "vitest";
import { formatPostDate } from "@/lib/utils";

describe("formatPostDate", () => {
  it("UTC로는 전날이어도 한국 시간 날짜로 보인다", () => {
    // 한국 시간 2026-01-08 01:30
    expect(formatPostDate("2026-01-07T16:30:00Z")).toBe("2026-01-08");
  });

  it("상세 화면용 한국식 표기도 한국 시간 기준이다", () => {
    expect(formatPostDate("2026-01-07T16:30:00Z", "ko")).toBe("2026. 1. 8.");
  });
});
