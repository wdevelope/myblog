import type { Metadata } from "next";
import Link from "next/link";
import BackButton from "@/app/_components/BackButton";
import PostEditor from "@/app/_components/PostEditor";
import { requireAdmin } from "@/lib/server/admin";

export const metadata: Metadata = {
  title: "다이어리 쓰기",
};

export const dynamic = "force-dynamic";

export default async function DiaryWritePage() {
  await requireAdmin("/diary/write");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center gap-3 text-sm text-muted">
        <BackButton
          fallbackHref="/diary"
          className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-surface px-3 text-sm font-bold text-foreground transition hover:bg-surface-2"
        >
          ← 뒤로
        </BackButton>
          <nav className="hidden items-center gap-2 sm:flex">
            <Link href="/diary" className="hover:text-foreground">
              다이어리
            </Link>
            <span className="text-muted/70">/</span>
            <span className="text-foreground">글쓰기</span>
          </nav>
        </div>

      <PostEditor type="diary" defaultVisibility="private" />
    </div>
  );
}
