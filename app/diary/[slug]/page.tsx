import { getPostForRoute } from "@/lib/server/posts";
import PostImages from "@/app/_components/PostImages";
import MarkdownContent from "@/app/_components/MarkdownContent";
import PostActionMenu from "@/app/_components/PostActionMenu";
import { notFound } from "next/navigation";
import Link from "next/link";
import PostMeta from "@/app/_components/PostMeta";
import { getPreviewViewer } from "@/lib/server/admin";
import { getPublicDiaryIndex } from "@/lib/server/publicPosts";

export const revalidate = 86400; // REVALIDATE_PERIOD

// 방문자에게는 어느 다이어리든 같은 안내 화면이라 미리 만들지 않고 첫 방문 때 만들어 캐시한다.
export function generateStaticParams() {
  return [];
}

export default async function DiaryEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { isAdmin } = await getPreviewViewer();

  // 다이어리 본문은 관리자 전용이다(draft mode). 방문자는 있는 다이어리면 안내 화면을, 없으면 404를 본다.
  const post = isAdmin ? await getPostForRoute("diary", slug) : null;
  const exists = isAdmin
    ? Boolean(post)
    : (await getPublicDiaryIndex()).some((entry) => entry.slug === slug);
  if (!exists) notFound();

  return (
    <article className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/diary"
          className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-transparent px-3 text-sm font-bold text-foreground transition hover:border-primary/30"
        >
          ← 목록으로
        </Link>
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
          <PostMeta
            createdAt={post?.createdAt}
            visibility={post?.visibility}
            views={`조회수 ${(post?.viewCount ?? 0).toLocaleString()}회`}
          />

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
              <MarkdownContent content={post.content} />
            </div>
            <PostImages imageKeys={post.imageKeys} />
          </>
        )}
      </div>
    </article>
  );
}
