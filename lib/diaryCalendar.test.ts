import { afterEach, describe, expect, it } from "vitest";
import { addMonths, buildCalendarGrid, isInMonth, kstDate, kstYmd } from "@/lib/diaryCalendar";

const ORIGINAL_TZ = process.env.TZ;

afterEach(() => {
  process.env.TZ = ORIGINAL_TZ;
});

describe("kstDate", () => {
  it("브라우저 시간대가 달라도 한국 날짜로 읽는다", () => {
    // 한국 시간 2026-11-02(월) 오전 8시
    const iso = "2026-11-01T23:00:00Z";

    for (const tz of ["Asia/Seoul", "America/Los_Angeles", "Pacific/Auckland", "UTC"]) {
      process.env.TZ = tz;
      expect(kstDate(iso)).toEqual({ year: 2026, month: 11, day: 2, weekday: 1 });
      expect(kstYmd(iso)).toBe("2026-11-02");
    }
  });

  it("UTC로는 전날이어도 한국 날짜가 바뀌는 자정을 넘긴다", () => {
    expect(kstYmd("2026-12-31T14:59:59Z")).toBe("2026-12-31");
    expect(kstYmd("2026-12-31T15:00:00Z")).toBe("2027-01-01");
  });
});

describe("addMonths", () => {
  it("연도를 넘겨 앞뒤로 움직인다", () => {
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(addMonths({ year: 2026, month: 6 }, 0)).toEqual({ year: 2026, month: 6 });
  });
});

describe("isInMonth", () => {
  it("그 달의 날짜만 맞는다", () => {
    expect(isInMonth("2026-11-30", { year: 2026, month: 11 })).toBe(true);
    expect(isInMonth("2026-12-01", { year: 2026, month: 11 })).toBe(false);
    expect(isInMonth("2026-01-01", { year: 2026, month: 1 })).toBe(true);
  });
});

describe("buildCalendarGrid", () => {
  it("일요일부터 42칸을 채우고 그 달 날짜를 표시한다", () => {
    const grid = buildCalendarGrid({ year: 2026, month: 11 });

    expect(grid).toHaveLength(42);
    // 2026-11-01은 일요일이라 첫 칸이 1일이다.
    expect(grid[0]).toEqual({ ymd: "2026-11-01", day: 1, inMonth: true });
    expect(grid.filter((d) => d.inMonth)).toHaveLength(30);
    expect(grid.at(-1)).toEqual({ ymd: "2026-12-12", day: 12, inMonth: false });
  });

  it("앞 달 날짜로 첫 주를 채운다", () => {
    const grid = buildCalendarGrid({ year: 2026, month: 10 });

    // 2026-10-01은 목요일이다.
    expect(grid[0]).toEqual({ ymd: "2026-09-27", day: 27, inMonth: false });
    expect(grid[4]).toEqual({ ymd: "2026-10-01", day: 1, inMonth: true });
  });

  it("브라우저 시간대가 달라도 칸의 날짜가 같다", () => {
    process.env.TZ = "Pacific/Auckland";
    const auckland = buildCalendarGrid({ year: 2026, month: 3 });
    process.env.TZ = "America/Los_Angeles";

    expect(buildCalendarGrid({ year: 2026, month: 3 })).toEqual(auckland);
  });
});
