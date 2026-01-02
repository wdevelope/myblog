import { getPostBySlug } from "@/lib/api";
import { getComments } from "@/lib/api";
import PostImages from "@/app/_components/PostImages";
import BackButton from "@/app/_components/BackButton";
import PostActionMenu from "@/app/_components/PostActionMenu";
import CommentsThread from "@/app/_components/CommentsThread";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CardBody } from "@/app/_components/ui";
import { getCurrentUser, isAdminDb } from "@/lib/server/admin";
import HtmlContent from "@/app/_components/HtmlContent";

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
          className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-transparent px-3 text-sm font-bold text-foreground transition hover:border-primary/30"
        >
          ← 목록으로
        </BackButton>
      </div>

      <header className="space-y-6">
        <p className="text-sm text-muted">
          <span className="font-semibold text-foreground">아티클</span>
          {post.categorySlug ? (
            <>
              <span className="mx-2 text-muted/70">/</span>
              <Link
                href={`/article?category=${encodeURIComponent(
                  post.categorySlug
                )}`}
                className="hover:text-foreground"
              >
                {post.categorySlug}
              </Link>
            </>
          ) : null}
        </p>

        <div className="flex items-start justify-between gap-4">
          <h1 className="min-w-0 text-2xl font-black tracking-tight md:text-3xl">
            {post.title}
          </h1>
          {isAdmin ? (
            <div className="shrink-0 pt-1">
              <PostActionMenu
                editHref={`/article/edit/${post.slug}`}
                deleteSlug={post.slug}
                deleteRedirectTo="/article"
                ariaLabel="아티클 더보기"
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div className="flex items-center gap-4">
            <Image
              src="/logo.png"
              alt="프로필"
              width={40}
              height={40}
              className="size-10 rounded-full object-cover ring-1 ring-border"
            />
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">원스</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>
                  {new Date(post.createdAt).toLocaleDateString("ko-KR")}
                </span>
                <span>·</span>
                <span>조회수 {(post.viewCount ?? 0).toLocaleString()}회</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  {post.visibility === "public" ? "공개" : "비공개"}
                  {post.visibility === "private" ? (
                    <span aria-hidden>🔒</span>
                  ) : null}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted" />
        </div>
      </header>

      <div className="space-y-6">
        <div className="text-sm">
          <HtmlContent content={post.content} />
        </div>
        <PostImages imageKeys={post.imageKeys} />
      </div>

      <div className="border-t border-border pt-8">
        <CardBody className="space-y-6 px-0">
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
      </div>
    </article>
  );
}
