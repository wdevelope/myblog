import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/server/admin";
import { getPostsDirectly } from "@/lib/server/posts";
import { Badge, ButtonLink, Card, CardBody } from "@/app/_components/ui";
import { toExcerpt } from "@/lib/markdown";
import { coverSrcFromImageKey } from "@/lib/image";

import { Suspense } from "react";
import { Skeleton } from "@/app/_components/ui";

export default function Home() {
  return (
    <div className="space-y-10">
      {/* Hero Section: 데이터 지연 없이 즉시 렌더링되는 영역 */}
      <section className="grid items-center gap-8 md:grid-cols-2">
        <div className="space-y-5">
          <h1 className="text-4xl font-black leading-tight tracking-tight md:text-5xl">
            안녕하세요. <br />
            개발자 원스입니다.
          </h1>

          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/feed">최신 피드 보기 →</ButtonLink>
            <Suspense fallback={<Skeleton className="h-12 w-24 rounded-2xl" />}>
              <UserActionButtons />
            </Suspense>
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="relative aspect-[16/10] overflow-hidden">
            <Image
              src="/logo.png"
              alt=""
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-background/70 via-black/10 to-surface/40" />
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

// 60초마다 페이지만 재생성하여 성능을 높입니다 (ISR)
export const revalidate = 60;

async function UserActionButtons() {
  const user = await getCurrentUser();
  const loggedIn = Boolean(user);

  if (loggedIn) return null;

  return (
    <ButtonLink href="/login" variant="secondary">
      로그인
    </ButtonLink>
  );
}

async function LatestArticlesSection() {
  const user = await getCurrentUser();
  const latestArticles = await getPostsDirectly({ type: "blog", limit: 6, user });

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
                    <span>
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex-1" />
                    {post.categorySlug ? (
                      <span className="text-muted">{post.categorySlug}</span>
                    ) : null}
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
                  <div className="pt-1">
                    <Link
                      href={`/article/${post.slug}`}
                      className="text-sm font-bold text-primary hover:opacity-90"
                      prefetch={false}
                    >
                      읽기 →
                    </Link>
                  </div>
                </div>

                {post.thumbnailImageKey ? (
                  <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-2xl ring-1 ring-border md:h-48 md:w-64">
                    <Image
                      src={coverSrcFromImageKey(post.thumbnailImageKey) ?? ""}
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

function LatestArticlesSkeleton() {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4 mb-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardBody className="flex flex-col gap-4 md:flex-row md:items-start">
              <div className="flex flex-1 flex-col justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-12 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-7 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
              <div className="h-28 w-full shrink-0 rounded-2xl bg-surface-2 ring-1 ring-border md:h-48 md:w-64">
                <Skeleton className="h-full w-full rounded-2xl" />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}
