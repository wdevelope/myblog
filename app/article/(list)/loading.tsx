import { Skeleton } from "@/app/_components/ui";

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
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="rounded-3xl border border-border bg-surface p-5 space-y-4">
                            <div className="flex justify-between">
                                <Skeleton className="h-6 w-24" />
                                <Skeleton className="h-5 w-5" />
                            </div>
                            <Skeleton className="aspect-video w-full rounded-2xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-7 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-2/3" />
                            </div>
                            <div className="flex justify-between pt-2">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-12" />
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
