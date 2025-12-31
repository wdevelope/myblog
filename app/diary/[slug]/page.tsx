import { getPostBySlug } from "@/lib/api";
import PostImages from "@/app/_components/PostImages";
import Markdown from "@/app/_components/Markdown";
import BackButton from "@/app/_components/BackButton";
import PostActionMenu from "@/app/_components/PostActionMenu";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge, Card, CardBody } from "@/app/_components/ui";
import { requireAdmin } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function DiaryEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdmin("/diary");
  const { slug } = await params;
  const post = await getPostBySlug({ slug });
  if (post.type !== "diary") notFound();

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center justify-between gap-4">
        <BackButton
          fallbackHref="/diary"
          className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-surface px-3 text-sm font-bold text-foreground transition hover:bg-surface-2"
        >
          ← 뒤로
        </BackButton>
      </div>

      <nav className="text-sm text-muted">
        <Link href="/" className="hover:text-foreground">
          홈
        </Link>
        <span className="mx-2">/</span>
        <Link href="/diary" className="hover:text-foreground">
          다이어리
        </Link>
      </nav>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <Badge variant="warning">다이어리</Badge>
          <span className="h-1 w-1 rounded-full bg-muted/60" />
          <span>{new Date(post.createdAt).toLocaleString()}</span>
          <span className="h-1 w-1 rounded-full bg-muted/60" />
          <span>{post.visibility === "public" ? "공개" : "비공개"}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="min-w-0 flex-1 text-4xl font-black tracking-tight md:text-5xl">
            {post.title}
          </h1>
          <PostActionMenu
            editHref={`/diary/edit/${post.slug}`}
            deleteSlug={post.slug}
            deleteRedirectTo="/diary"
            ariaLabel="다이어리 더보기"
          />
        </div>
      </header>

      <Card>
        <CardBody>
          <Markdown content={post.content} />
          <PostImages imageKeys={post.imageKeys} />
        </CardBody>
      </Card>
    </article>
  );
}
