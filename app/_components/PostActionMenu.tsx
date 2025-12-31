"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import DeletePostButton from "@/app/_components/DeletePostButton";

function DotsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "size-5"}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </svg>
  );
}

export default function PostActionMenu({
  editHref,
  deleteSlug,
  deleteRedirectTo,
  ariaLabel = "더보기",
  className,
}: {
  editHref?: string;
  deleteSlug: string;
  deleteRedirectTo?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const root = rootRef.current;
      if (!root) return;
      if (!open) return;
      if (e.target instanceof Node && root.contains(e.target)) return;
      setOpen(false);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={["relative", className].filter(Boolean).join(" ")} ref={rootRef}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-10 items-center justify-center bg-transparent text-foreground/80 transition hover:text-foreground"
      >
        <DotsIcon className="size-4.5 text-muted" />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-20 mt-2 w-36 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl shadow-black/10"
        >
          {editHref ? (
            <Link
              href={editHref}
              role="menuitem"
              className="flex w-full items-center justify-center px-4 py-3 text-sm font-bold text-foreground transition hover:bg-surface-2"
              onClick={() => setOpen(false)}
            >
              수정하기
            </Link>
          ) : null}
          <DeletePostButton
            slug={deleteSlug}
            redirectTo={deleteRedirectTo}
            className="flex w-full items-center justify-center px-4 py-3 text-sm font-bold text-foreground transition hover:bg-surface-2"
          >
            삭제하기
          </DeletePostButton>
        </div>
      ) : null}
    </div>
  );
}
