import Link from "next/link";
import Image from "next/image";
import { getPublicPosts } from "@/lib/server/publicPosts";
import { Badge, ButtonLink, Card, CardBody } from "@/app/_components/ui";
import { toExcerpt } from "@/lib/markdown";
import { coverKeyOf, coverSrcFromImageKey } from "@/lib/image";
import { formatPostDate } from "@/lib/utils";
import AuthButton from "@/app/_components/AuthButton";

import { Suspense } from "react";
import LatestArticlesSkeleton from "@/app/(home)/LatestArticlesSkeleton";

export default function Home() {
  return (
    <div className="space-y-10">
      {/* Hero Section: 데이터 지연 없이 즉시 렌더링되는 영역 */}
      <section className="grid items-center gap-8 md:grid-cols-2">
        <div className="space-y-5">
          <h1 className="text-4xl font-black leading-tight tracking-tight md:text-5xl">
            안녕하세요. <br />
            개발자 오웬입니다.
          </h1>

          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/feed">최신 피드 보기 →</ButtonLink>
            {/* 클라이언트에서 인증 상태 확인 후 로그인/로그아웃 표시 */}
            <AuthButton
              loginClassName="inline-flex h-12 items-center justify-center rounded-2xl border border-border bg-transparent px-5 text-sm font-bold text-foreground transition hover:border-primary/40 hover:bg-surface"
              logoutClassName="inline-flex h-12 items-center justify-center rounded-2xl border border-border bg-transparent px-5 text-sm font-bold text-foreground transition hover:border-primary/40 hover:bg-surface"
            />
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="relative aspect-16/10 overflow-hidden">
            <Image
              src="/logo.png"
              alt=""
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-linear-to-tr from-background/70 via-black/10 to-surface/40" />
          </div>
        </Card>
      </section>

      {/* Latest Articles Section: 데이터 로딩 중 Suspense 처리 */}
      <Suspense fallback={<LatestArticlesSkeleton />}>
        <LatestArticlesSection />
      </Suspense>
    </div>
  );
}

// 1일마다 페이지만 재생성하여 성능을 높입니다 (ISR)
export const revalidate = 86400; // REVALIDATE_PERIOD

async function LatestArticlesSection() {
  // ISR을 위해 공개 포스트만 가져옴 (동적 API 호출 없음)
  const { data: latestArticles } = await getPublicPosts({
    type: "blog",
    limit: 6,
  });

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4 mb-3">
        <div className="flex items-center gap-5">
          <span className="border-b-2 border-primary pb-3 text-sm font-bold text-primary">
            최신 아티클
          </span>
        </div>
        <Link
          href="/article"
          className="text-sm font-bold text-primary hover:opacity-90"
        >
          더 보기 →
        </Link>
      </div>

      <div className="space-y-4">
        {latestArticles.map((post, index) => {
          const coverKey = coverKeyOf(post);
          return (
            <Card
              key={post.id}
              className="overflow-hidden transition hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
            >
              <CardBody className="flex flex-col gap-4 md:flex-row md:items-start">
                <div className="flex flex-1 flex-col justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <Badge variant="primary">아티클</Badge>
                    <span>•</span>
                    <span className="font-medium text-muted/80">{post.categorySlug || "전체"}</span>
                    <span className="flex-1" />
                    <span>{formatPostDate(post.createdAt)}</span>
                  </div>
                  <div className="space-y-2">
                    <Link
                      href={`/article/${post.slug}`}
                      className="text-xl font-bold leading-tight text-foreground hover:text-primary"
                      prefetch={false}
                    >
                      {post.title}
                    </Link>
                    <p className="line-clamp-2 text-sm leading-relaxed text-muted">
                      {toExcerpt(post.content)}
                    </p>
                  </div>
                </div>

                {coverKey ? (
                  <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-2xl ring-1 ring-border md:h-48 md:w-64">
                    <Image
                      src={coverSrcFromImageKey(coverKey)}
                      alt={post.title}
                      fill
                      sizes="(min-width: 768px) 256px, 100vw"
                      className="object-cover"
                      priority={index === 0}
                    />
                  </div>
                ) : (
                  <div className="h-28 w-full shrink-0 rounded-2xl bg-surface-2 ring-1 ring-border md:h-48 md:w-64" />
                )}
              </CardBody>
            </Card>
          );
        })}
        {latestArticles.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-sm text-muted">아직 아티클이 없어요.</p>
            </CardBody>
          </Card>
        ) : null}
      </div>
    </section>
  );
}
