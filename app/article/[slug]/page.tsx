import type { Metadata, ResolvingMetadata } from "next";
import { getArticleWithCommentsDirectly } from "@/lib/server/posts";
import { getPublicComments, getPublicPost, getPublicPosts } from "@/lib/server/publicPosts";
import PostImages from "@/app/_components/PostImages";
import { ArticleListBackButton } from "@/app/article/ArticleListMemory";
import PostActionMenu from "@/app/_components/PostActionMenu";
import CommentsThread from "@/app/_components/CommentsThread";
import { notFound } from "next/navigation";
import Link from "next/link";
import PostMeta from "@/app/_components/PostMeta";
import { CardBody } from "@/app/_components/ui";
import { getPreviewViewer } from "@/lib/server/admin";
import MarkdownContent from "@/app/_components/MarkdownContent";
import { toExcerpt } from "@/lib/markdown";
import { articleListHref } from "@/lib/constants";
import ViewCount from "@/app/article/[slug]/ViewCount";
import { coverKeyOf, coverSrcFromImageKey } from "@/lib/image";
import { blogPostingJsonLd } from "@/lib/structured-data";

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
  const cover = coverKeyOf(post);
  // openGraph를 새로 정하면 상위 값을 통째로 덮는다. url은 다시 넣고, 표지가 없으면 app/opengraph-image의 기본 이미지를 이어 받는다.
  const { openGraph } = await parent;
  return {
    title: post.title,
    description,
    openGraph: {
      title: post.title,
      description,
      type: "article",
      url: "./",
      images: cover ? coverSrcFromImageKey(cover) : openGraph?.images,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const { isAdmin } = await getPreviewViewer();

  // 관리자는 draft mode에서 비공개 글과 그 댓글까지 본다. 방문자는 공개 글·댓글 캐시를 본다.
  const adminArticle = isAdmin ? await getArticleWithCommentsDirectly(slug) : null;
  const post = isAdmin ? adminArticle?.post : await getPublicPost("blog", slug);
  if (!post) notFound();

  const comments = adminArticle?.comments ?? (await getPublicComments("blog", post.id));

  return (
    <article className="mx-auto max-w-4xl space-y-5">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: blogPostingJsonLd(post) }} />
      <div className="flex items-center justify-between gap-4">
        <ArticleListBackButton
          className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-transparent px-3 text-sm font-bold text-foreground transition hover:border-primary/30"
        >
          ← 목록으로
        </ArticleListBackButton>
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
          <PostMeta
            createdAt={post.createdAt}
            visibility={post.visibility}
            views={<ViewCount slug={post.slug} initialCount={post.viewCount ?? 0} />}
          />

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
