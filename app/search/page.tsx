import type { Metadata } from "next";
import ArticleListItem from "@/app/article/ArticleListItem";
import { normalizeSearchQuery, SEARCH_QUERY_MAX_LENGTH } from "@/lib/search";
import { SEARCH_RESULT_LIMIT, searchPublicArticles } from "@/lib/server/publicSearch";
import { Button } from "@/app/_components/ui";

export const metadata: Metadata = {
  title: "검색",
  robots: { index: false },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// 검색어마다 달라 동적이지만 쿠키는 읽지 않는다. 관리자 화면이어도 공개 아티클만 찾는다.
export default async function SearchPage({ searchParams }: Props) {
  const query = normalizeSearchQuery((await searchParams).q);
  const posts = query ? await searchPublicArticles(query) : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2 sm:py-6">
      <h1 className="text-2xl font-black tracking-tight text-foreground">검색</h1>

      <form action="/search" method="get" role="search" className="flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">검색어</span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            maxLength={SEARCH_QUERY_MAX_LENGTH}
            enterKeyHint="search"
            placeholder="아티클 제목·본문 검색"
            className="h-11 w-full rounded-xl border border-border bg-surface px-4 text-base text-foreground placeholder:text-muted outline-none transition focus:border-primary sm:text-sm"
          />
        </label>
        <Button
          type="submit"
          size="lg" className="shrink-0"
        >
          검색
        </Button>
      </form>

      {query ? (
        <section className="space-y-3">
          <p className="text-sm text-muted">
            <span className="font-bold text-foreground">‘{query}’</span> 검색 결과{" "}
            <span className="font-bold text-primary">{posts.length}</span>개
            {posts.length === SEARCH_RESULT_LIMIT ? ` (최근 ${SEARCH_RESULT_LIMIT}개까지 보여 줍니다)` : null}
          </p>

          {posts.length ? (
            <ul className="divide-y divide-border border-y border-border">
              {posts.map((post, index) => (
                <ArticleListItem key={post.id} post={post} priority={index === 0} />
              ))}
            </ul>
          ) : (
            <div className="py-16 text-center">
              <p className="text-sm text-muted">검색 결과가 없습니다. 다른 검색어로 찾아 보세요.</p>
            </div>
          )}
        </section>
      ) : (
        <div className="py-16 text-center">
          <p className="text-sm text-muted">찾을 아티클의 제목이나 본문 내용을 입력해 주세요.</p>
        </div>
      )}
    </div>
  );
}
