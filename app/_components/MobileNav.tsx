"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, Search, X } from "lucide-react";
import LogoutButton from "@/app/_components/LogoutButton";
import { useSessionUser } from "@/app/_components/useSessionUser";
import { NAV_LINKS, isNavActive } from "@/lib/constants";
import { SEARCH_QUERY_MAX_LENGTH } from "@/lib/search";
import { cn } from "@/lib/utils";
import { ButtonLink, buttonClass } from "@/app/_components/ui";

export default function MobileNav() {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const { user, loading } = useSessionUser();

  function open() {
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  const loggedIn = !loading && Boolean(user);

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={buttonClass({ variant: "secondary", size: "icon", className: "md:hidden" })}
        aria-label="메뉴 열기"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 text-foreground backdrop:bg-black/35"
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="ml-auto flex h-full w-[250px] flex-col border-l border-border bg-surface shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-border p-4">
            <span className="text-sm font-black">메뉴</span>
            <button
              type="button"
              onClick={close}
              className={buttonClass({ variant: "secondary", size: "icon" })}
              aria-label="메뉴 닫기"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          <div className="flex-1 space-y-6 overflow-auto p-4">
            <form action="/search" method="get" role="search">
              <label className="block">
                <span className="sr-only">검색</span>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                    <Search className="size-4" aria-hidden />
                  </div>
                  <input
                    type="search"
                    name="q"
                    maxLength={SEARCH_QUERY_MAX_LENGTH}
                    enterKeyHint="search"
                    placeholder="아티클 검색…"
                    className="h-11 w-full rounded-xl border border-border bg-surface-2 pl-9 pr-3 text-base text-foreground placeholder:text-muted outline-none transition focus:border-primary/60 sm:text-sm"
                  />
                </div>
              </label>
            </form>

            <nav className="space-y-1">
              {NAV_LINKS.map((link) => {
                const active = isNavActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex h-11 items-center justify-between rounded-xl px-3 text-sm font-bold transition",
                      active ? "bg-primary/12 text-primary" : "hover:bg-surface-2",
                    )}
                  >
                    <span>{link.label}</span>
                    <ArrowRight className="size-4 text-muted" aria-hidden />
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="space-y-2 border-t border-border p-4">
            {loggedIn ? (
              <>
                <ButtonLink
                  href="/mypage"
                  variant="secondary" size="lg" className="w-full"
                >
                  마이페이지
                </ButtonLink>
                <LogoutButton className={buttonClass({ variant: "secondary", size: "lg", className: "w-full" })}>
                  로그아웃
                </LogoutButton>
              </>
            ) : (
              <ButtonLink
                href="/login"
                size="lg" className="w-full"
              >
                로그인
              </ButtonLink>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
