import type { Metadata } from "next";
import Link from "next/link";
import PostEditor from "@/app/_components/PostEditor";
import { requireAdmin } from "@/lib/server/admin";

export const metadata: Metadata = {
  title: "일기 쓰기",
};

export const dynamic = "force-dynamic";

export default async function DiaryWritePage() {
  await requireAdmin("/diary/write");

  return (
    <div className="space-y-6">
      <nav className="text-sm text-muted">
        <Link href="/" className="hover:text-foreground">
          홈
        </Link>
        <span className="mx-2">/</span>
        <Link href="/diary" className="hover:text-foreground">
          일기
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">글쓰기</span>
      </nav>

      <PostEditor type="diary" defaultVisibility="private" />
    </div>
  );
}

