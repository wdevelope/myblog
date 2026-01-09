import Link from "next/link";
import { getCurrentUser } from "@/lib/server/admin";
import LogoutButton from "@/app/_components/LogoutButton";
import MobileNav from "@/app/_components/MobileNav";
import NavLink from "@/app/_components/NavLink";
import Image from "next/image";

function Brand() {
  return (
    <Link
      href="/"
      className="group flex items-center gap-3 text-foreground transition-opacity hover:opacity-90"
    >
      <span className="flex size-9 items-center justify-center overflow-hidden rounded-xl bg-primary/15 ring-1 ring-primary/20">
        <Image
          src="/logo.png"
          alt="Logo"
          width={36}
          height={36}
          className="size-full object-cover"
        />
      </span>
      <span className="text-base font-bold tracking-tight">Wonse</span>
    </Link>
  );
}

export default async function SiteHeader() {
  const user = await getCurrentUser();
  const loggedIn = Boolean(user);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-8">
          <Brand />
          <nav className="hidden items-center gap-6 md:flex">
            <NavLink href="/feed">피드</NavLink>
            <NavLink href="/article">아티클</NavLink>
            <NavLink href="/diary">다이어리</NavLink>
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <label className="hidden w-full max-w-sm md:block">
            <span className="sr-only">검색</span>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                <span className="text-sm">⌕</span>
              </div>
              <input
                type="text"
                placeholder="게시글 검색…"
                className="h-10 w-full rounded-xl border border-border bg-surface/70 pl-9 pr-3 text-sm text-foreground placeholder:text-muted outline-none ring-0 transition focus:border-primary/60 focus:bg-surface"
              />
            </div>
          </label>

          {loggedIn ? (
            <LogoutButton className="hidden h-10 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:bg-surface-2 sm:flex">
              로그아웃
            </LogoutButton>
          ) : (
            <Link
              href="/login"
              className="hidden h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110 sm:flex"
            >
              로그인
            </Link>
          )}
          <MobileNav loggedIn={loggedIn} />
        </div>
      </div>
    </header>
  );
}
