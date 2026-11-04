"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, CloudSun } from "lucide-react";
import PostActionMenu from "@/app/_components/PostActionMenu";
import VisibilityIcon from "@/app/_components/VisibilityIcon";
import { useHydrated } from "@/app/_components/useHydrated";
import { cn } from "@/lib/utils";

type DiaryPost = {
  id: string;
  slug: string;
  title: string;
  createdAt: string;
  visibility: "public" | "private";
};

function formatYmdKst(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

function buildWriteHref(selectedYmd: string | null) {
  if (!selectedYmd) return "/diary/write";
  return `/diary/write?date=${encodeURIComponent(selectedYmd)}`;
}

function addMonths(base: Date, diff: number) {
  const next = new Date(base);
  next.setMonth(next.getMonth() + diff, 1);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfMonth(base: Date) {
  const d = new Date(base.getFullYear(), base.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonth(base: Date) {
  const d = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildCalendarGrid(month: Date) {
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
  const [viewMode, setViewMode] = useState<"day" | "month">("day");
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
  const ITEMS_PER_PAGE = 10;

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

  const totalPages = Math.ceil(visiblePosts.length / ITEMS_PER_PAGE);
  const paginatedPosts = visiblePosts.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const monthGrid = useMemo(() => buildCalendarGrid(month), [month]);

  const monthTitle = useMemo(() => {
    return `${month.getFullYear()}년 ${month.getMonth() + 1}월`;
  }, [month]);

  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

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
              <Link
                href={buildWriteHref(selectedYmd)}
                className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110"
              >
                다이어리 쓰기
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
        <aside className="lg:col-span-4 xl:col-span-3">
          <div className="space-y-6 lg:sticky lg:top-24">
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
                    {viewMode === "day" ? monthTitle : `${month.getFullYear()}년`}
                  </p>
                  <ChevronRight
                    className={`size-4 text-muted transition-transform duration-200 ${viewMode === "month" ? "rotate-90" : ""
                      }`}
                  />
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMonth((m) =>
                        viewMode === "day"
                          ? addMonths(m, -1)
                          : new Date(m.getFullYear() - 1, m.getMonth(), 1)
                      );
                      setPage(1);
                      setSelectedYmd(null);
                    }}
                    className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-surface text-foreground transition hover:bg-surface-2"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMonth((m) =>
                        viewMode === "day"
                          ? addMonths(m, 1)
                          : new Date(m.getFullYear() + 1, m.getMonth(), 1)
                      );
                      setPage(1);
                      setSelectedYmd(null);
                    }}
                    className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-surface text-foreground transition hover:bg-surface-2"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </div>
              </div>

              {viewMode === "day" ? (
                <>
                  <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted">
                    {dayNames.map((d) => (
                      <div key={d} className="py-1">
                        {d}
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 grid grid-cols-7 gap-2 text-center">
                    {monthGrid.map(({ date, inMonth }) => {
                      const ymd = formatYmdKst(date);
                      const hasEntry = entryDays.has(ymd);
                      const isSelected = selectedYmd === ymd;

                      return (
                        <button
                          key={ymd}
                          type="button"
                          onClick={() => {
                            setSelectedYmd((prev) => (prev === ymd ? null : ymd));
                            setPage(1);
                          }}
                          className={cn(
                            "relative flex h-9 w-full items-center justify-center rounded-xl text-sm font-semibold transition",
                            inMonth ? "text-foreground" : "text-muted/50",
                            hasEntry
                              ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20"
                              : "hover:bg-surface-2",
                            isSelected ? "ring-2 ring-primary/60" : "ring-0",
                          )}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const currentMonth = new Date(month.getFullYear(), i, 1);
                    const isCurrentMonth = i === month.getMonth();
                    const monthLabel = `${i + 1}월`;

                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setMonth(currentMonth);
                          setViewMode("day");
                          setPage(1);
                          setSelectedYmd(null);
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
          <div className="rounded-3xl border border-border bg-background shadow-sm">
            <div className="divide-y divide-border">
              {paginatedPosts.length ? (
                paginatedPosts.map((post) => {
                  const date = new Date(post.createdAt);

                  return (
                    <div
                      key={post.id}
                      className="px-5 py-6 transition hover:bg-surface-2/60 first:rounded-t-3xl last:rounded-b-3xl"
                    >
                      <div className="flex items-start gap-5">
                        {/* Prominent Date Display */}
                        <div className="flex flex-col items-center justify-center min-w-14 transition-colors group-hover:text-primary">
                          <span className="text-xs font-semibold text-muted/60">
                            {date.getMonth() + 1}월
                          </span>
                          <span className="text-2xl font-black text-foreground/80">
                            {date.getDate()}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1 space-y-2 py-0.5">
                          <div className="flex items-start justify-between gap-3">
                            {post.visibility === "public" || isAdmin ? (
                              <Link
                                href={`/diary/${post.slug}`}
                                className="block min-w-0 flex-1"
                                prefetch={false}
                              >
                                <h2 className="truncate text-lg font-bold text-foreground transition hover:text-primary">
                                  {post.title}
                                </h2>
                              </Link>
                            ) : (
                              <h2 className="truncate text-lg font-bold text-foreground/80">
                                {post.title}
                              </h2>
                            )}
                            <div className="flex items-center gap-2">
                              {post.visibility === "private" && (
                                <VisibilityIcon visibility="private" className="size-3.5" />
                              )}
                              {isAdmin ? (
                                <PostActionMenu
                                  editHref={`/diary/edit/${post.slug}`}
                                  deleteSlug={post.slug}
                                  deleteRedirectTo="/diary"
                                  ariaLabel="다이어리 더보기"
                                />
                              ) : null}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
                            <p className="text-sm text-muted">
                              {date.getFullYear()}년 {date.getMonth() + 1}월{" "}
                              {date.getDate()}일 ({dayNames[date.getDay()]})
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-16 text-center">
                  <p className="text-sm text-muted">
                    {selectedYmd
                      ? "선택한 날짜에 작성한 다이어리가 없습니다."
                      : "아직 다이어리가 없습니다."}
                  </p>
                  {isAdmin ? (
                    <div className="mt-4">
                      <Link
                        href={buildWriteHref(selectedYmd)}
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110"
                      >
                        {selectedYmd
                          ? "선택한 날짜에 다이어리 작성하기"
                          : "오늘 다이어리 작성하기"}
                      </Link>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 rounded-xl border border-border bg-surface text-sm font-medium transition hover:bg-surface-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                이전
              </button>
              <span className="flex items-center px-4 text-sm font-medium text-muted">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-4 py-2 rounded-xl border border-border bg-surface text-sm font-medium transition hover:bg-surface-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                다음
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
