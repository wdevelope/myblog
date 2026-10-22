import { Skeleton } from "@/app/_components/ui";
import { ArticleListItemSkeleton } from "@/app/article/ArticleListItem";

// 홈 loading.tsx와 최신 아티클 Suspense fallback이 같이 쓴다.
export default function LatestArticlesSkeleton() {
  return (
    <section>
      <div className="flex items-end justify-between gap-4 border-b border-border pb-3">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-16" />
      </div>

      <div className="divide-y divide-border border-b border-border">
        {[1, 2, 3].map((i) => (
          <ArticleListItemSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
