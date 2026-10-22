"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiMenu, FiX, FiSearch } from "react-icons/fi";
import LogoutButton from "@/app/_components/LogoutButton";
import { useSessionUser } from "@/app/_components/useSessionUser";

export default function MobileNav() {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const { user, loading } = useSessionUser();

  const links = useMemo(
    () => [
      { href: "/feed", label: "피드" },
      { href: "/article", label: "아티클" },
      { href: "/diary", label: "다이어리" },
    ],
    [],
  );

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
        className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-surface text-foreground md:hidden"
        aria-label="메뉴 열기"
      >
        <FiMenu className="size-5" aria-hidden />
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
              className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-surface text-foreground transition hover:bg-surface-2"
              aria-label="메뉴 닫기"
            >
              <FiX className="size-5" aria-hidden />
            </button>
          </div>

          <div className="flex-1 space-y-6 overflow-auto p-4">
            <label className="block">
              <span className="sr-only">검색</span>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
                  <FiSearch className="size-4" aria-hidden />
                </div>
                <input
                  type="text"
                  placeholder="게시글 검색…"
                  className="h-11 w-full rounded-xl border border-border bg-surface-2 pl-9 pr-3 text-base text-foreground placeholder:text-muted outline-none transition focus:border-primary/60 sm:text-sm"
                />
              </div>
            </label>

            <nav className="space-y-1">
              {links.map((link) => {
                const active = pathname?.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={[
                      "flex h-11 items-center justify-between rounded-xl px-3 text-sm font-bold transition",
                      active ? "bg-primary/12 text-primary" : "hover:bg-surface-2",
                    ].join(" ")}
                  >
                    <span>{link.label}</span>
                    <span className="text-muted">→</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-border p-4">
            {loggedIn ? (
              <LogoutButton className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-surface text-sm font-bold text-foreground transition hover:bg-surface-2">
                로그아웃
              </LogoutButton>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110"
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
