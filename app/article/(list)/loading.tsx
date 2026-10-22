import { Skeleton } from "@/app/_components/ui";
import { ArticleListItemSkeleton } from "@/app/article/ArticleListItem";

export default function ArticleLoading() {
    return (
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
            {/* Sidebar Skeleton */}
            <aside className="lg:col-span-2 lg:col-start-1">
                <div className="space-y-6">
                    <Skeleton className="h-4 w-24 mx-1" />
                    <div className="space-y-1.5 font-bold">
                        {[...Array(6)].map((_, i) => (
                            <Skeleton key={i} className="h-11 w-full rounded-2xl" />
                        ))}
                    </div>
                </div>
            </aside>

            {/* Main Content Skeleton */}
            <main className="lg:col-span-10 lg:col-start-3">
                <div className="divide-y divide-border border-y border-border">
                    {[...Array(6)].map((_, i) => (
                        <ArticleListItemSkeleton key={i} />
                    ))}
                </div>
            </main>
        </div>
    );
}
