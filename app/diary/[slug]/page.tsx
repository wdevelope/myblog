import { getPostBySlug } from "@/lib/api";
import PostImages from "@/app/_components/PostImages";
import Markdown from "@/app/_components/Markdown";
import BackButton from "@/app/_components/BackButton";
import PostActionMenu from "@/app/_components/PostActionMenu";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardBody } from "@/app/_components/ui";
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
    <article className="mx-auto max-w-4xl space-y-10">
      <div className="flex items-center justify-between gap-4">
        <BackButton
          fallbackHref="/diary"
          className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-surface px-3 text-sm font-bold text-foreground transition hover:bg-surface-2"
        >
          ← 목록으로
        </BackButton>
      </div>

      <header className="space-y-6">
        <p className="text-sm text-muted">
          <span className="font-semibold text-foreground">w-life</span>
          <span className="mx-2 text-muted/70">/</span>
          <Link href="/diary" className="hover:text-foreground">
            다이어리
          </Link>
        </p>

        <h1 className="text-4xl font-black tracking-tight md:text-5xl">
          {post?.title ?? "비공개 다이어리"}
        </h1>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-full bg-surface-2 ring-1 ring-border" />
            <div className="space-y-1">
              <p className="text-base font-bold text-foreground">원스</p>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                <span>
                  {post ? new Date(post.createdAt).toLocaleDateString("ko-KR") : ""}
                </span>
                <span>·</span>
                <span>
                  조회수 {(post?.viewCount ?? 0).toLocaleString()}회
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  {post ? (post.visibility === "public" ? "공개" : "비공개") : "비공개"}
                  {post?.visibility === "private" ? <span aria-hidden>🔒</span> : null}
                </span>
              </div>
            </div>
          </div>

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
