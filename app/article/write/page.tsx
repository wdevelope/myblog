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

      <header className="space-y-2">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          아티클 쓰기
        </h1>
        <p className="text-sm text-muted">
          본문은 마크다운으로 저장돼요. 상단 버튼으로 서식을 빠르게 넣을 수
          있어요.
        </p>
      </header>

      <PostEditor type="blog" />
    </div>
  );
}
