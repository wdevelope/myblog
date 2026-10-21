import { getPostBySlugDirectly } from "@/lib/server/posts";
import PostImages from "@/app/_components/PostImages";
import HtmlContent from "@/app/_components/HtmlContent";
import BackButton from "@/app/_components/BackButton";
import PostActionMenu from "@/app/_components/PostActionMenu";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FiLock, FiGlobe } from "react-icons/fi";
import { getViewer } from "@/lib/server/admin";

export const revalidate = 86400; // REVALIDATE_PERIOD

export default async function DiaryEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { user, isAdmin } = await getViewer();

  let post = null;
  try {
    post = await getPostBySlugDirectly({ slug, user });
  } catch (e) {
    const err = e as { status?: number };
    if (err.status === 403 || err.status === 404) {
      post = null;
    } else {
      throw e;
    }
  }

  if (post && post.type !== "diary") notFound();

  return (
    <article className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <BackButton
          fallbackHref="/diary"
          className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-transparent px-3 text-sm font-bold text-foreground transition hover:border-primary/30"
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

        <h1 className="text-2xl font-black tracking-tight md:text-3xl">
          {post?.title ?? "비공개 다이어리"}
        </h1>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
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
                  {post
                    ? new Date(post.createdAt).toLocaleDateString("ko-KR")
                    : ""}
                </span>
                <span>·</span>
                <span>조회수 {(post?.viewCount ?? 0).toLocaleString()}회</span>
                <span>·</span>
                <span className="flex items-center gap-1.5 font-medium group">
                  {post?.visibility === "private" ? (
                    <FiLock className="size-3.5 text-amber-500" aria-hidden />
                  ) : (
                    <FiGlobe className="size-3.5 text-emerald-500" aria-hidden />
                  )}
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

      <div className="space-y-6">
        {post && (
          <>
            <div className="text-sm">
              <HtmlContent content={post.content} />
            </div>
            <PostImages imageKeys={post.imageKeys} />
          </>
        )}
      </div>
    </article>
  );
}
