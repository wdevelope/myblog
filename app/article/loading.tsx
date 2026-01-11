import { Skeleton } from "@/app/_components/ui";

export default function ArticleLoading() {
    return (
        <div className="grid gap-8 lg:grid-cols-12">
            {/* Sidebar Skeleton */}
            <aside className="lg:col-span-3 lg:col-start-1">
                <div className="space-y-4">
                    <Skeleton className="h-5 w-32" />
                    <div className="space-y-2">
                        {[...Array(6)].map((_, i) => (
                            <Skeleton key={i} className="h-9 w-full" />
                        ))}
                    </div>
                </div>
            </aside>

            {/* Main Content Skeleton */}
            <main className="lg:col-span-9 lg:col-start-4">
                <header className="mb-6 border-b border-border pb-4">
                    <div className="flex items-end justify-between gap-4">
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-40" />
                            <Skeleton className="h-4 w-56" />
                        </div>
                    </div>
                </header>

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
