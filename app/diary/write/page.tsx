import type { Metadata } from "next";
import Link from "next/link";
import BackButton from "@/app/_components/BackButton";
import PostEditor from "@/app/_components/PostEditor";
import { requireAdmin } from "@/lib/server/admin";

export const metadata: Metadata = {
  title: "다이어리 쓰기",
};

export const dynamic = "force-dynamic";

function isYmd(input: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(input);
}

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DiaryWritePage({ searchParams }: Props) {
  await requireAdmin("/diary/write");

  const sp = (await searchParams) ?? {};
  const dateParam = typeof sp.date === "string" ? sp.date : null;
  const createdAtYmd = dateParam && isYmd(dateParam) ? dateParam : undefined;

  return (
    <div className="mx-auto space-y-8">
      <div className="flex items-center gap-3 text-sm text-muted">
        <BackButton
          fallbackHref="/diary"
          className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-transparent px-3 text-sm font-bold text-foreground transition hover:border-primary/30"
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

      <PostEditor
        type="diary"
        defaultVisibility="private"
        createdAtYmd={createdAtYmd}
      />
    </div>
  );
}
