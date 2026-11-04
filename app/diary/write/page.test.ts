import { afterEach, describe, expect, it, vi } from "vitest";
import DiaryWritePage from "@/app/diary/write/page";

vi.mock("@/app/_components/PostEditor", () => ({ default: () => null }));
vi.mock("@/lib/server/admin", () => ({ requireAdmin: vi.fn() }));

afterEach(() => {
  vi.useRealTimers();
});

describe("다이어리 쓰기 화면의 제목", () => {
  it("달력에서 날짜를 고르고 들어오면 그 날짜로 제목을 채운다", async () => {
    const page = await DiaryWritePage({
      searchParams: Promise.resolve({ date: "2026-03-09" }),
    });

    expect(page.props.defaultTitle).toBe("2026년 3월 9일의 기록");
  });

  it("날짜 없이 들어오면 오늘 한국 날짜로 제목을 채운다", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // 한국 시간 2026-11-05 01:00
    vi.setSystemTime(new Date("2026-11-04T16:00:00Z"));

    const page = await DiaryWritePage({});

    expect(page.props.defaultTitle).toBe("2026년 11월 5일의 기록");
  });
});
