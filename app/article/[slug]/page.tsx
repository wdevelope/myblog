import { getPostBySlug } from "@/lib/api";
import { getComments } from "@/lib/api";
import PostImages from "@/app/_components/PostImages";
import Markdown from "@/app/_components/Markdown";
import BackButton from "@/app/_components/BackButton";
import PostActionMenu from "@/app/_components/PostActionMenu";
import CommentsThread from "@/app/_components/CommentsThread";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardBody } from "@/app/_components/ui";
import { getCurrentUser, isAdminDb } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let post: Awaited<ReturnType<typeof getPostBySlug>>;
  try {
    post = await getPostBySlug({ slug });
  } catch (e) {
    const err = e as { status?: number };
    if (err.status === 401)
      redirect(`/login?from=${encodeURIComponent(`/article/${slug}`)}`);
    if (err.status === 403) redirect("/");
    throw e;
  }
  if (post.type !== "blog") notFound();
  const user = await getCurrentUser();
  const isAdmin = await isAdminDb(user);
  const comments = user ? await getComments({ postId: post.id }) : [];

  return (
    <article className="mx-auto max-w-4xl space-y-10">
      <div className="flex items-center justify-between gap-4">
        <BackButton
          fallbackHref="/article"
          className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-surface px-3 text-sm font-bold text-foreground transition hover:bg-surface-2"
        >
          ← 목록으로
        </BackButton>
        {isAdmin ? (
          <PostActionMenu
            editHref={`/article/edit/${post.slug}`}
            deleteSlug={post.slug}
            deleteRedirectTo="/article"
            ariaLabel="아티클 더보기"
          />
        ) : null}
      </div>

      <header className="space-y-6">
        <p className="text-sm text-muted">
          <span className="font-semibold text-foreground">w-life</span>
          {post.categorySlug ? (
            <>
              <span className="mx-2 text-muted/70">/</span>
              <Link
                href={`/article?category=${encodeURIComponent(post.categorySlug)}`}
                className="hover:text-foreground"
              >
                {post.categorySlug}
              </Link>
            </>
          ) : null}
        </p>

        <h1 className="text-3xl font-black tracking-tight md:text-4xl">
          {post.title}
        </h1>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-full bg-surface-2 ring-1 ring-border" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">원스</p>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                <span>{new Date(post.createdAt).toLocaleDateString("ko-KR")}</span>
                <span>·</span>
                <span>조회수 {(post.viewCount ?? 0).toLocaleString()}회</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  {post.visibility === "public" ? "공개" : "비공개"}
                  {post.visibility === "private" ? <span aria-hidden>🔒</span> : null}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted" />
        </div>
      </header>

      <Card>
        <CardBody className="space-y-6">
          <Markdown content={post.content} />
          <PostImages imageKeys={post.imageKeys} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-6">
          {user ? (
            <CommentsThread postSlug={post.slug} comments={comments} canWrite />
          ) : (
            <div className="space-y-3">
              <h2 className="text-2xl font-black tracking-tight text-foreground">
                댓글
              </h2>
              <p className="text-sm text-muted">
                로그인 후 댓글을 확인/작성할 수 있어요.
              </p>
              <Link
                href={`/login?from=${encodeURIComponent(`/article/${slug}`)}`}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110"
              >
                로그인하기
              </Link>
            </div>
          )}
        </CardBody>
      </Card>
    </article>
  );
}
