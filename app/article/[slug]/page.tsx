import type { Metadata, ResolvingMetadata } from "next";
import { getPostForRoute, getCommentsDirectly } from "@/lib/server/posts";
import { getPublicComments, getPublicPost, getPublicPosts } from "@/lib/server/publicPosts";
import PostImages from "@/app/_components/PostImages";
import BackButton from "@/app/_components/BackButton";
import PostActionMenu from "@/app/_components/PostActionMenu";
import CommentsThread from "@/app/_components/CommentsThread";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FiLock, FiGlobe } from "react-icons/fi";
import { CardBody } from "@/app/_components/ui";
import { getPreviewViewer } from "@/lib/server/admin";
import MarkdownContent from "@/app/_components/MarkdownContent";
import { formatPostDate } from "@/lib/utils";
import { toExcerpt } from "@/lib/markdown";
import { articleListHref } from "@/lib/constants";

export const revalidate = 86400; // REVALIDATE_PERIOD

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const { data } = await getPublicPosts({ type: "blog" });
  return data.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublicPost("blog", slug);
  if (!post) return {};
  const description = toExcerpt(post.content, 160);
  // openGraph를 새로 정하면 상위 값을 통째로 덮어 app/opengraph-image의 기본 이미지가 빠지므로 이어 받는다.
  const { openGraph } = await parent;
  return {
    title: post.title,
    description,
    openGraph: { title: post.title, description, type: "article", images: openGraph?.images },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const { isAdmin } = await getPreviewViewer();

  // 관리자는 draft mode에서 비공개 글과 그 댓글까지 본다. 방문자는 공개 글·댓글 캐시를 본다.
  const post = isAdmin ? await getPostForRoute("blog", slug) : await getPublicPost("blog", slug);
  if (!post) notFound();

  const comments = isAdmin
    ? await getCommentsDirectly(post)
    : await getPublicComments("blog", post.id);

  return (
    <article className="mx-auto max-w-4xl space-y-5">
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
                href={articleListHref(post.categorySlug)}
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
              <p className="text-sm font-bold text-foreground">오웬</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>
                  {formatPostDate(post.createdAt, "ko")}
                </span>
                <span>·</span>
                <span>조회수 {(post.viewCount ?? 0).toLocaleString()}회</span>
                <span>·</span>
                <span className="flex items-center gap-1.5 font-medium group">
                  {post.visibility === "private" ? (
                    <FiLock className="size-3.5 text-amber-500" aria-hidden />
                  ) : (
                    <FiGlobe className="size-3.5 text-emerald-500" aria-hidden />
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted" />
        </div>
      </header>

      <div className="space-y-6">
        <div className="text-sm">
          <MarkdownContent content={post.content} />
        </div>
        <PostImages imageKeys={post.imageKeys} />
      </div>

      <div className="border-t border-border pt-8">
        <CardBody className="space-y-6 px-0">
          <CommentsThread postSlug={post.slug} comments={comments} isAdmin={isAdmin} />
        </CardBody>
      </div>
    </article>
  );
}
