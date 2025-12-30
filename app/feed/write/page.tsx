import type { Metadata } from "next";
import Link from "next/link";
import PostEditor from "@/app/_components/PostEditor";
import { requireAdmin } from "@/lib/server/admin";

export const metadata: Metadata = {
  title: "피드 쓰기",
};

export const dynamic = "force-dynamic";

export default async function FeedWritePage() {
  await requireAdmin("/feed/write");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <nav className="text-sm text-muted">
        <Link href="/" className="hover:text-foreground">
          홈
        </Link>
        <span className="mx-2">/</span>
        <Link href="/feed" className="hover:text-foreground">
          피드
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">글쓰기</span>
      </nav>

      <PostEditor type="feed" />
    </div>
  );
}
