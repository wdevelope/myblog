import { Skeleton } from "@/app/_components/ui";
import LatestArticlesSkeleton from "@/app/(home)/LatestArticlesSkeleton";

export default function Loading() {
    return (
        <div className="space-y-10">
            {/* Hero Section Skeleton */}
            <section className="grid items-center gap-8 md:grid-cols-2">
                <div className="space-y-5">
                    <div className="space-y-3">
                        <Skeleton className="h-10 w-32 md:h-12" />
                        <Skeleton className="h-10 w-48 md:h-12" />
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                        <Skeleton className="h-12 w-32 rounded-2xl" />
                        <Skeleton className="h-12 w-24 rounded-2xl" />
                    </div>
                </div>

                <div className="overflow-hidden rounded-3xl">
                    <Skeleton className="aspect-[16/10] w-full" />
                </div>
            </section>

            <LatestArticlesSkeleton />
        </div>
    );
}
