import Link from "next/link";
import { isLoggedIn } from "@/lib/auth/session";

function Brand() {
  return (
    <Link
      href="/"
      className="group flex items-center gap-3 text-foreground transition-opacity hover:opacity-90"
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20">
        <span className="text-base font-black tracking-tight">D</span>
      </span>
      <span className="text-base font-bold tracking-tight">DevLog</span>
    </Link>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm font-medium text-muted transition-colors hover:text-foreground"
    >
      {children}
    </Link>
  );
}

export default async function SiteHeader() {
  const loggedIn = await isLoggedIn();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-8">
          <Brand />
          <nav className="hidden items-center gap-6 md:flex">
            <NavLink href="/">Home</NavLink>
            <NavLink href="/blog">Blog</NavLink>
            <NavLink href="/feed">Feed</NavLink>
            <NavLink href="/diary">
              <span className="inline-flex items-center gap-1">Diary</span>
            </NavLink>
            {loggedIn ? <NavLink href="/admin">Admin</NavLink> : null}
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <label className="hidden w-full max-w-sm md:block">
            <span className="sr-only">Search</span>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                <span className="text-sm">⌕</span>
              </div>
              <input
                type="text"
                placeholder="Search posts…"
                className="h-10 w-full rounded-xl border border-border bg-surface/70 pl-9 pr-3 text-sm text-foreground placeholder:text-muted outline-none ring-0 transition focus:border-primary/60 focus:bg-surface"
              />
            </div>
          </label>

          {loggedIn ? (
            <Link
              href="/auth/logout"
              className="hidden h-10 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:bg-surface-2 sm:flex"
            >
              Logout
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="hidden h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110 sm:flex"
            >
              Login
            </Link>
          )}

          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-surface text-foreground md:hidden"
            aria-label="Menu"
          >
            ☰
          </button>
        </div>
      </div>
    </header>
  );
}
