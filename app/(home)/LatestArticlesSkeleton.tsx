import { Skeleton, Card, CardBody } from "@/app/_components/ui";

// 홈 loading.tsx와 최신 아티클 Suspense fallback이 같이 쓴다.
export default function LatestArticlesSkeleton() {
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
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
              <div className="h-28 w-full shrink-0 rounded-2xl md:h-48 md:w-64">
                <Skeleton className="h-full w-full rounded-2xl" />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}
