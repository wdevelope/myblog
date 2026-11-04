"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/app/_components/ui";
import { addMonths, buildCalendarGrid, DAY_NAMES, type YearMonth } from "@/lib/diaryCalendar";
import { cn } from "@/lib/utils";

export default function DiaryCalendar({
  month,
  selectedYmd,
  entryDays,
  onMonthChange,
  onToggleDay,
}: {
  month: YearMonth;
  selectedYmd: string | null;
  entryDays: Set<string>;
  onMonthChange: (month: YearMonth) => void;
  onToggleDay: (ymd: string) => void;
}) {
  const [viewMode, setViewMode] = useState<"day" | "month">("day");
  const monthGrid = useMemo(() => buildCalendarGrid(month), [month]);
  const monthTitle = `${month.year}년 ${month.month}월`;

  function moveBy(diff: number) {
    onMonthChange(
      viewMode === "day"
        ? addMonths(month, diff)
        : { year: month.year + diff, month: month.month },
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-background p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setViewMode((prev) => (prev === "day" ? "month" : "day"))
          }
          className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-surface-2 transition"
        >
          <p className="text-lg font-black tracking-tight text-foreground">
            {viewMode === "day" ? monthTitle : `${month.year}년`}
          </p>
          <ChevronRight
            className={`size-4 text-muted transition-transform duration-200 ${viewMode === "month" ? "rotate-90" : ""
              }`}
          />
        </button>

        <div className="flex items-center gap-1">
          <Button
            onClick={() => moveBy(-1)}
            variant="secondary" size="icon" className="size-9"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <Button
            onClick={() => moveBy(1)}
            variant="secondary" size="icon" className="size-9"
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>
      </div>

      {viewMode === "day" ? (
        <>
          <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted">
            {DAY_NAMES.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2 text-center">
            {monthGrid.map(({ ymd, day, inMonth }) => {
              const hasEntry = entryDays.has(ymd);
              const isSelected = selectedYmd === ymd;

              return (
                <button
                  key={ymd}
                  type="button"
                  onClick={() => onToggleDay(ymd)}
                  className={cn(
                    "relative flex h-9 w-full items-center justify-center rounded-xl text-sm font-semibold transition",
                    inMonth ? "text-foreground" : "text-muted/50",
                    hasEntry
                      ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20"
                      : "hover:bg-surface-2",
                    isSelected ? "ring-2 ring-primary/60" : "ring-0",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {Array.from({ length: 12 }).map((_, i) => {
            const isCurrentMonth = i + 1 === month.month;
            const monthLabel = `${i + 1}월`;

            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                      onMonthChange({ year: month.year, month: i + 1 });
                      setViewMode("day");
                    }}
                className={cn(
                  "flex h-12 items-center justify-center rounded-xl text-sm font-bold transition",
                  isCurrentMonth
                    ? "bg-primary text-white shadow-lg shadow-primary/25"
                    : "bg-surface text-foreground hover:bg-surface-2",
                )}
              >
                {monthLabel}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
