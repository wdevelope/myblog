export const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

export function formatYmdKst(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

export function addMonths(base: Date, diff: number) {
  const next = new Date(base);
  next.setMonth(next.getMonth() + diff, 1);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function startOfMonth(base: Date) {
  const d = new Date(base.getFullYear(), base.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfMonth(base: Date) {
  const d = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function buildCalendarGrid(month: Date) {
  const start = startOfMonth(month);
  const end = endOfMonth(month);

  const startDow = start.getDay(); // 0=Sun
  const firstGridDate = new Date(start);
  firstGridDate.setDate(start.getDate() - startDow);

  const days: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(firstGridDate);
    d.setDate(firstGridDate.getDate() + i);
    d.setHours(0, 0, 0, 0);
    const inMonth = d >= start && d <= end;
    days.push({ date: d, inMonth });
  }
  return days;
}
