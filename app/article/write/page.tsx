import type { Metadata } from "next";
import Link from "next/link";
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
      <nav className="text-sm text-muted">
        <Link href="/" className="hover:text-foreground">
          홈
        </Link>
        <span className="mx-2">/</span>
        <Link href="/article" className="hover:text-foreground">
          아티클
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">글쓰기</span>
      </nav>

      <PostEditor type="blog" />
    </div>
  );
}
