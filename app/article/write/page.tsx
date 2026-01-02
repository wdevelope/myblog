import type { Metadata } from "next";
import Link from "next/link";
import BackButton from "@/app/_components/BackButton";
import PostEditor from "@/app/_components/PostEditor";
import { requireAdmin } from "@/lib/server/admin";

export const metadata: Metadata = {
  title: "아티클 쓰기",
};

export const dynamic = "force-dynamic";

export default async function ArticleWritePage() {
  await requireAdmin("/article/write");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center gap-3 text-sm text-muted">
        <BackButton
          fallbackHref="/article"
          className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-surface px-3 text-sm font-bold text-foreground transition hover:bg-surface-2"
        >
          ← 뒤로
        </BackButton>
        <nav className="hidden items-center gap-2 sm:flex">
          <Link href="/article" className="hover:text-foreground">
            아티클
          </Link>
          <span className="text-muted/70">/</span>
          <span className="text-foreground">글쓰기</span>
        </nav>
      </div>

      <header className="space-y-2">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          아티클 쓰기
        </h1>
        <p className="text-sm text-muted">본문은 마크다운으로 저장돼요.</p>
      </header>

      <PostEditor type="blog" />
    </div>
  );
}
