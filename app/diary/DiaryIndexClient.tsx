"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { ChevronRight, CloudSun } from "lucide-react";
import DiaryCalendar from "@/app/diary/DiaryCalendar";
import DiaryList, { type DiaryPost } from "@/app/diary/DiaryList";
import { useHydrated } from "@/app/_components/useHydrated";
import { ButtonLink } from "@/app/_components/ui";
import { endOfMonth, formatYmdKst, startOfMonth } from "@/lib/diaryCalendar";

function buildWriteHref(selectedYmd: string | null) {
  if (!selectedYmd) return "/diary/write";
  return `/diary/write?date=${encodeURIComponent(selectedYmd)}`;
}

export default function DiaryIndexClient({
  posts,
  isAdmin,
}: {
  posts: DiaryPost[];
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedYmd, setSelectedYmd] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const hydrated = useHydrated();

  // sessionStorage는 브라우저에만 있어 서버 HTML과 맞추려고 hydration 뒤의 첫 렌더에서 한 번만 읽는다.
  // effect에서 읽으면 렌더가 한 번 더 연쇄되므로 렌더 중에 state를 맞춘다.
  if (hydrated && !isInitialized) {
    setIsInitialized(true);

    // 1. Check URL Params
    const urlYear = searchParams.get("year");
    const urlMonth = searchParams.get("month");
    const urlDate = searchParams.get("date");

    if (urlYear && urlMonth) {
      const m = parseInt(urlMonth, 10) - 1;
      const y = parseInt(urlYear, 10);
      if (!isNaN(m) && !isNaN(y)) {
        setMonth(new Date(y, m, 1));
      }
      if (urlDate) {
        setSelectedYmd(urlDate);
      }
    } else {
      // 2. Check LocalStorage
      try {
        const storedYm = sessionStorage.getItem("diary_view_ym"); // "YYYY-MM"
        const storedDate = sessionStorage.getItem("diary_selected_date"); // "YYYY-MM-DD" or null

        if (storedYm) {
          const [y, m] = storedYm.split("-").map(Number);
          if (!isNaN(y) && !isNaN(m)) {
            setMonth(new Date(y, m - 1, 1));
          }
        }
        if (storedDate) {
          setSelectedYmd(storedDate);
        }
      } catch {
        // Ignore errors
      }
    }
  }

  // Sync state to URL and LocalStorage
  useEffect(() => {
    if (!isInitialized) return;

    // Save to SessionStorage
    const ymStr = `${month.getFullYear()}-${String(
      month.getMonth() + 1
    ).padStart(2, "0")}`;
    sessionStorage.setItem("diary_view_ym", ymStr);
    if (selectedYmd) {
      sessionStorage.setItem("diary_selected_date", selectedYmd);
    } else {
      sessionStorage.removeItem("diary_selected_date");
    }

    // Update URL (Shallow) if changed
    const currentParams = new URLSearchParams(searchParams.toString());
    const newYear = month.getFullYear().toString();
    const newMonth = (month.getMonth() + 1).toString();

    const needsUpdate =
      currentParams.get("year") !== newYear ||
      currentParams.get("month") !== newMonth ||
      currentParams.get("date") !== (selectedYmd ?? null);

    if (needsUpdate) {
      const params = new URLSearchParams(currentParams);
      params.set("year", newYear);
      params.set("month", newMonth);
      if (selectedYmd) {
        params.set("date", selectedYmd);
      } else {
        params.delete("date");
      }
      // router.replace는 같은 페이지라도 서버에 다시 요청한다(관리자면 다이어리 전체를 다시 읽는다).
      // 주소만 바꾸면 되므로 history를 직접 쓴다. Next가 useSearchParams와 동기화한다.
      window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
    }
  }, [month, selectedYmd, isInitialized, pathname, searchParams]);

  const entryDays = useMemo(() => {
    const set = new Set<string>();
    for (const p of posts) set.add(formatYmdKst(new Date(p.createdAt)));
    return set;
  }, [posts]);

  const [page, setPage] = useState(1);

  const visiblePosts = useMemo(() => {
    let filtered = posts;

    if (selectedYmd) {
      filtered = posts.filter(
        (p) => formatYmdKst(new Date(p.createdAt)) === selectedYmd
      );
    } else {
      // If no date selected, show only posts for the current view month
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      // Extend end to include the last second of the month
      const endOfDay = new Date(end);
      endOfDay.setHours(23, 59, 59, 999);

      filtered = posts.filter((p) => {
        const d = new Date(p.createdAt);
        return d >= start && d <= endOfDay;
      });
    }

    const sorted = [...filtered].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
    return sorted;
  }, [posts, selectedYmd, month]);

  function changeMonth(next: Date) {
    setMonth(next);
    setPage(1);
    setSelectedYmd(null);
  }

  function toggleDay(ymd: string) {
    setSelectedYmd((prev) => (prev === ymd ? null : ymd));
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Header Row - Moved outside to align grid items at the top */}
      {selectedYmd || isAdmin ? (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {selectedYmd ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedYmd(null);
                  setPage(1);
                }}
                className="text-sm font-semibold text-primary hover:opacity-80"
              >
                전체 보기
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {isAdmin ? (
              <ButtonLink
                href={buildWriteHref(selectedYmd)}
                size="sm"
              >
                다이어리 쓰기
              </ButtonLink>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
        <aside className="lg:col-span-4 xl:col-span-3">
          <div className="space-y-6 lg:sticky lg:top-24">
            <DiaryCalendar
              month={month}
              selectedYmd={selectedYmd}
              entryDays={entryDays}
              onMonthChange={changeMonth}
              onToggleDay={toggleDay}
            />

            {isAdmin ? (
              <Link
                href={buildWriteHref(selectedYmd)}
                className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-background p-5 transition hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex items-center gap-4">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    <CloudSun className="size-6" aria-hidden />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-bold text-foreground">
                      오늘은 어떤 하루였나요?
                    </p>
                    <p className="text-sm text-muted">
                      {selectedYmd
                        ? `${selectedYmd.replaceAll("-", ".")} 작성하기`
                        : "오늘 다이어리 작성하기"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-5 text-muted transition group-hover:text-foreground" />
              </Link>
            ) : null}
          </div>
        </aside>

        <section className="lg:col-span-8 xl:col-span-9">
          <DiaryList
            posts={visiblePosts}
            page={page}
            onPageChange={setPage}
            selectedYmd={selectedYmd}
            isAdmin={isAdmin}
            writeHref={buildWriteHref(selectedYmd)}
          />
        </section>
      </div>
    </div>
  );
}
