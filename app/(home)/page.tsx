import Link from "next/link";
import Image from "next/image";
import { getPublicPosts } from "@/lib/server/publicPosts";
import { ButtonLink, Card, CardBody } from "@/app/_components/ui";
import AuthButton from "@/app/_components/AuthButton";
import ArticleListItem from "@/app/article/ArticleListItem";

import type { Metadata, ResolvingMetadata } from "next";
import { RSS_ALTERNATE_TYPES, SITE_OPEN_GRAPH } from "@/lib/constants";

// 빌드가 홈을 /index 경로로 미리 그려 루트 레이아웃의 "./"가 /index로 풀린다. 홈만 대표 주소를 직접 정하고,
// alternates·openGraph를 통째로 덮으므로 RSS 링크와 app/opengraph-image의 기본 이미지를 다시 넣는다.
export async function generateMetadata(_: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const { openGraph } = await parent;
  return {
    alternates: { canonical: "/", types: RSS_ALTERNATE_TYPES },
    openGraph: { ...SITE_OPEN_GRAPH, url: "/", images: openGraph?.images },
  };
}

export default function Home() {
  return (
    <div className="space-y-10">
      {/* Hero Section */}
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
              src="/hero.jpg"
              alt=""
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
              priority
            />
          </div>
        </Card>
      </section>

      {/* Suspense로 감싸면 관리자 이동에 스켈레톤이 뜨고 React가 최소 300ms 남겨 내용이 늦게 보인다(로드맵 23절). */}
      <LatestArticlesSection />
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
    <section>
      {/* 파란 밑줄이 회색 선을 덮도록 -mb-px로 겹쳐 선을 하나로 보이게 한다. */}
      <div className="flex items-end justify-between gap-4 border-b border-border">
        <div className="flex items-center gap-5">
          <span className="-mb-px border-b-2 border-primary pb-3 text-sm font-bold text-primary">
            최신 아티클
          </span>
        </div>
        <Link
          href="/article"
          className="pb-3 text-sm font-bold text-primary hover:opacity-90"
        >
          더 보기 →
        </Link>
      </div>

      {latestArticles.length ? (
        <ul className="divide-y divide-border border-b border-border">
          {latestArticles.map((post, index) => (
            <ArticleListItem key={post.id} post={post} priority={index === 0} />
          ))}
        </ul>
      ) : (
        <Card className="mt-4">
          <CardBody>
            <p className="text-sm text-muted">아직 아티클이 없어요.</p>
          </CardBody>
        </Card>
      )}
    </section>
  );
}
