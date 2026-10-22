import Link from "next/link";
import { draftMode } from "next/headers";
import MobileNav from "@/app/_components/MobileNav";
import NavLink from "@/app/_components/NavLink";
import AccountButton from "@/app/_components/AccountButton";
import AdminModeToggle from "@/app/_components/AdminModeToggle";
import AdminNavProgress from "@/app/_components/AdminNavProgress";
import { Suspense } from "react";
import Image from "next/image";
import { ThemeToggle } from "@/app/_components/ThemeToggle";
import { SEARCH_QUERY_MAX_LENGTH } from "@/lib/search";

function Brand() {
  return (
    <Link
      href="/"
      className="group flex items-center gap-3 text-foreground transition-opacity hover:opacity-90"
    >
      <span className="flex size-9 items-center justify-center overflow-hidden rounded-xl bg-primary/15">
        <Image
          src="/site-logo.png"
          alt="Logo"
          width={36}
          height={36}
          className="size-full object-cover"
        />
      </span>
      <span className="text-base font-bold tracking-tight">Owen</span>
    </Link>
  );
}

// ISR을 위해 정적으로 렌더링 - 로그인 상태는 클라이언트에서 처리.
// draftMode()는 정적 생성 때 false이고 동적 API로 잡히지 않아, 방문자 HTML은 그대로이고
// 관리자가 관리자 화면을 켠 요청에서만 true로 렌더링된다.
export default async function SiteHeader() {
  const { isEnabled: adminMode } = await draftMode();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/75 backdrop-blur-md">
      {/* useSearchParams를 읽어 Suspense로 감싼다. 관리자 화면 요청에서만 그리므로 방문자 정적 HTML에는 없다. */}
      {adminMode ? (
        <Suspense fallback={null}>
          <AdminNavProgress />
        </Suspense>
      ) : null}
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-8">
          <Brand />
          <nav className="hidden items-center gap-6 md:flex">
            <NavLink href="/feed">피드</NavLink>
            <NavLink href="/article">아티클</NavLink>
            <NavLink href="/diary">다이어리</NavLink>
            <NavLink href="/guestbook">방명록</NavLink>
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          {/* 클라이언트 JS 없이 GET으로 제출해 정적 헤더를 그대로 둔다. */}
          <form
            action="/search"
            method="get"
            role="search"
            className="hidden w-full max-w-sm md:block lg:max-w-xs"
          >
            <label className="block">
              <span className="sr-only">검색</span>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                  <span className="text-sm">⌕</span>
                </div>
                <input
                  type="search"
                  name="q"
                  maxLength={SEARCH_QUERY_MAX_LENGTH}
                  enterKeyHint="search"
                  placeholder="아티클 검색…"
                  className="h-10 w-full rounded-xl border border-border bg-surface/70 pl-9 pr-3 text-sm text-foreground placeholder:text-muted outline-none ring-0 transition focus:border-primary/60 focus:bg-surface"
                />
              </div>
            </label>
          </form>

          <ThemeToggle />

          {/* 클라이언트에서 인증 상태 확인 후 로그인 버튼 또는 마이페이지 아바타 표시 */}
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <AdminModeToggle enabled={adminMode} className="flex h-10 px-4" />
            <AccountButton loginClassName="h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110 flex" />
          </div>
          <MobileNav adminMode={adminMode} />
        </div>
      </div>
    </header>
  );
}
