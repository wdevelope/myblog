"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import PostActionMenu from "@/app/_components/PostActionMenu";
import { toExcerptMarkdown } from "@/lib/markdown";

type DiaryPost = {
  id: string;
  slug: string;
  title: string;
  content: string;
  createdAt: string;
  visibility: "public" | "private";
};

type SortMode = "latest" | "oldest";

function formatYmdKst(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

function formatDateKorean(date: Date) {
  return date
    .toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\. /g, ".")
    .replace(/\.$/, "");
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

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "size-5"}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "size-5"}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15.75 19.5L8.25 12l7.5-7.5"
      />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "size-5"}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8.25 4.5l7.5 7.5-7.5 7.5"
      />
    </svg>
  );
}

function WeatherIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "size-6"}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 15.75A4.5 4.5 0 017.5 11.25h.207a6 6 0 0111.337 1.665A3.75 3.75 0 0118.75 20.25H7.5A4.5 4.5 0 013 15.75z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 3.75v1.5m6.364.636l-1.06 1.06M20.25 12h-1.5m-.636 6.364l-1.06-1.06"
      />
    </svg>
  );
}

export default function DiaryIndexClient({ posts }: { posts: DiaryPost[] }) {
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedYmd, setSelectedYmd] = useState<string | null>(null);

  const entryDays = useMemo(() => {
    const set = new Set<string>();
    for (const p of posts) set.add(formatYmdKst(new Date(p.createdAt)));
    return set;
  }, [posts]);

  const distinctDayCount = entryDays.size;

  const visiblePosts = useMemo(() => {
    const filtered = selectedYmd
      ? posts.filter((p) => formatYmdKst(new Date(p.createdAt)) === selectedYmd)
      : posts;

    const sorted = [...filtered].sort((a, b) =>
      sortMode === "latest"
        ? b.createdAt.localeCompare(a.createdAt)
        : a.createdAt.localeCompare(b.createdAt),
    );
    return sorted;
  }, [posts, selectedYmd, sortMode]);

  const monthGrid = useMemo(() => buildCalendarGrid(month), [month]);

  const monthTitle = useMemo(() => {
    return `${month.getFullYear()}년 ${month.getMonth() + 1}월`;
  }, [month]);

  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <section className="lg:col-span-8 xl:col-span-9">
        <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-muted">
              <span className="sr-only">정렬</span>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="h-9 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary/60"
              >
                <option value="latest">최신순</option>
                <option value="oldest">오래된순</option>
              </select>
            </label>
            {selectedYmd ? (
              <button
                type="button"
                onClick={() => setSelectedYmd(null)}
                className="text-sm font-semibold text-primary hover:opacity-80"
              >
                전체 보기
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold text-muted">
              {distinctDayCount}일의 기록
            </p>
            <Link
              href={buildWriteHref(selectedYmd)}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110"
            >
              다이어리 쓰기
            </Link>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-background shadow-sm">
          <div className="divide-y divide-border">
            {visiblePosts.length ? (
              visiblePosts.map((post) => (
                <div
                  key={post.id}
                  className="px-5 py-6 transition hover:bg-surface-2/60"
                >
                  <div className="relative flex items-start gap-3">
                    <div className="mt-0.5 text-muted/80">
                      <LockIcon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <Link
                        href={`/diary/${post.slug}`}
                        className="block min-w-0"
                      >
                        <h2 className="truncate text-lg font-bold text-foreground transition hover:text-primary">
                          {post.title}
                        </h2>
                      </Link>
                      <p className="line-clamp-2 text-sm leading-6 text-muted">
                        {toExcerptMarkdown(post.content, 180)}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <p className="text-sm text-muted">
                          {formatDateKorean(new Date(post.createdAt))}
                        </p>
                        <div className="min-w-[2.5rem]" />
                      </div>
                    </div>
                  </div>

                  <PostActionMenu
                    className="absolute right-3 top-3 z-10"
                    editHref={`/diary/edit/${post.slug}`}
                    deleteSlug={post.slug}
                    deleteRedirectTo="/diary"
                  />
                </div>
              ))
            ) : (
              <div className="py-16 text-center">
                <p className="text-sm text-muted">
                  {selectedYmd
                    ? "선택한 날짜에 작성한 다이어리가 없습니다."
                    : "아직 다이어리가 없습니다."}
                </p>
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
              </div>
            )}
          </div>
        </div>
      </section>

      <aside className="lg:col-span-4 xl:col-span-3">
        <div className="space-y-6 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-lg font-black tracking-tight text-foreground">
                  {monthTitle}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMonth((m) => addMonths(m, -1))}
                  className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-surface text-foreground transition hover:bg-surface-2"
                  aria-label="이전 달"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setMonth((m) => addMonths(m, 1))}
                  className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-surface text-foreground transition hover:bg-surface-2"
                  aria-label="다음 달"
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>
            </div>

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
                    }}
                    className={[
                      "relative flex h-9 w-full items-center justify-center rounded-xl text-sm font-semibold transition",
                      inMonth
                        ? "text-foreground"
                        : "text-muted/50",
                      hasEntry
                        ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20"
                        : "hover:bg-surface-2",
                      isSelected ? "ring-2 ring-primary/60" : "ring-0",
                    ].join(" ")}
                    aria-label={`${ymd}${hasEntry ? " 다이어리 있음" : ""}`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          <Link
            href={buildWriteHref(selectedYmd)}
            className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-background p-5 transition hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <WeatherIcon className="size-6" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-foreground">
                  오늘은 어떤 하루였나요?
                </p>
                <p className="text-sm text-muted">
                  {selectedYmd ? `${selectedYmd.replaceAll("-", ".")} 작성하기` : "오늘 다이어리 작성하기"}
                </p>
              </div>
            </div>
            <ChevronRight className="size-5 text-muted transition group-hover:text-foreground" />
          </Link>
        </div>
      </aside>
    </div>
  );
}
