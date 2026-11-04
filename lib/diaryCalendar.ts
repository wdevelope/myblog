export const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

export type YearMonth = { year: number; month: number };

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toYmd(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

// 다이어리 날짜는 어디서 보든 한국 달력이다. 한국은 서머타임이 없어 9시간을 더한 뒤 UTC로 읽으면 된다.
export function kstDate(value: string | Date) {
  const date = new Date(new Date(value).getTime() + KST_OFFSET_MS);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    weekday: date.getUTCDay(),
  };
}

export function kstYmd(value: string | Date) {
  const { year, month, day } = kstDate(value);
  return toYmd(year, month, day);
}

export function addMonths({ year, month }: YearMonth, diff: number): YearMonth {
  const index = year * 12 + month - 1 + diff;
  return { year: Math.floor(index / 12), month: (((index % 12) + 12) % 12) + 1 };
}

export function isInMonth(ymd: string, { year, month }: YearMonth) {
  return ymd.startsWith(`${year}-${pad(month)}-`);
}

export function buildCalendarGrid({ year, month }: YearMonth) {
  const first = Date.UTC(year, month - 1, 1);
  const firstWeekday = new Date(first).getUTCDay();

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(first + (index - firstWeekday) * DAY_MS);
    return {
      ymd: toYmd(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()),
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month - 1,
    };
  });
}
