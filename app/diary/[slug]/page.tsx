import { getPostBySlug } from "@/lib/api";
import PostImages from "@/app/_components/PostImages";
import Markdown from "@/app/_components/Markdown";
import BackButton from "@/app/_components/BackButton";
import PostActionMenu from "@/app/_components/PostActionMenu";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge, Card, CardBody } from "@/app/_components/ui";
import { getCurrentUser, isAdminDb } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function DiaryEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const isAdmin = await isAdminDb(user);

  let post: Awaited<ReturnType<typeof getPostBySlug>> | null = null;
  try {
    post = await getPostBySlug({ slug });
  } catch (e) {
    const err = e as { status?: number };
    if (err.status === 401 || err.status === 403) {
      post = null;
    } else {
      throw e;
    }
  }

  if (post && post.type !== "diary") notFound();

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center justify-between gap-4">
        <BackButton
          fallbackHref="/diary"
          className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-surface px-3 text-sm font-bold text-foreground transition hover:bg-surface-2"
        >
          ← 목록으로
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
          <span>{post ? new Date(post.createdAt).toLocaleString() : ""}</span>
          <span className="h-1 w-1 rounded-full bg-muted/60" />
          <span>{post ? (post.visibility === "public" ? "공개" : "비공개") : "비공개"}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="min-w-0 flex-1 text-4xl font-black tracking-tight md:text-5xl">
            {post?.title ?? "비공개 다이어리"}
          </h1>
          {isAdmin && post ? (
            <PostActionMenu
              editHref={`/diary/edit/${post.slug}`}
              deleteSlug={post.slug}
              deleteRedirectTo="/diary"
              ariaLabel="다이어리 더보기"
            />
          ) : null}
        </div>
      </header>

      <Card>
        <CardBody>
          {post ? (
            <>
              <Markdown content={post.content} />
              <PostImages imageKeys={post.imageKeys} />
            </>
          ) : (
            <p className="text-sm text-muted">해당 글은 비공개입니다.</p>
          )}
        </CardBody>
      </Card>
    </article>
  );
}
