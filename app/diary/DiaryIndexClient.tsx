"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { ChevronRight, CloudSun } from "lucide-react";
import DiaryCalendar from "@/app/diary/DiaryCalendar";
import DiaryList, { type DiaryPost } from "@/app/diary/DiaryList";
import { ButtonLink } from "@/app/_components/ui";
import {
  diaryViewQuery,
  isInMonth,
  kstDate,
  kstYmd,
  parseDiaryView,
  type DiaryView,
} from "@/lib/diaryCalendar";

const STORED_VIEW_KEY = "diary_view";

const subscribe = () => () => {};

function readStoredView() {
  try {
    return sessionStorage.getItem(STORED_VIEW_KEY);
  } catch {
    return null;
  }
}

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
  const storedView = useSyncExternalStore(subscribe, readStoredView, () => null);
  const [today] = useState(() => kstDate(new Date()));
  const [page, setPage] = useState(1);

  // 보는 달과 날짜는 주소가 정한다. 주소에 없으면 이 탭에서 마지막으로 본 달, 그것도 없으면 이번 달이다.
  const { month, selectedYmd } = parseDiaryView(searchParams) ??
    parseDiaryView(new URLSearchParams(storedView ?? "")) ?? {
      month: { year: today.year, month: today.month },
      selectedYmd: null,
    };

  function showView(view: DiaryView) {
    const query = diaryViewQuery(view);
    // router.replace는 같은 페이지라도 서버에 다시 요청한다(관리자면 다이어리 전체를 다시 읽는다).
    // 주소만 바꾸면 되므로 history를 직접 쓴다. Next가 useSearchParams와 동기화한다.
    window.history.replaceState(null, "", `${pathname}?${query}`);
    try {
      sessionStorage.setItem(STORED_VIEW_KEY, query);
    } catch {
      // 저장소를 막아도 주소로 동작한다.
    }
    setPage(1);
  }

  const entryDays = useMemo(() => {
    const set = new Set<string>();
    for (const p of posts) set.add(kstYmd(p.createdAt));
    return set;
  }, [posts]);

  const visiblePosts = useMemo(() => {
    const filtered = posts.filter((p) => {
      const ymd = kstYmd(p.createdAt);
      return selectedYmd ? ymd === selectedYmd : isInMonth(ymd, month);
    });

    return [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [posts, selectedYmd, month]);

  return (
    <div className="space-y-6">
      {/* Header Row - Moved outside to align grid items at the top */}
      {selectedYmd || isAdmin ? (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {selectedYmd ? (
              <button
                type="button"
                onClick={() => showView({ month, selectedYmd: null })}
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
              onMonthChange={(next) => showView({ month: next, selectedYmd: null })}
              onToggleDay={(ymd) => showView({ month, selectedYmd: selectedYmd === ymd ? null : ymd })}
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
