import { Skeleton } from "@/app/_components/ui";

export default function DiaryLoading() {
    return (
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
            {/* Sidebar/Calendar Skeleton */}
            <aside className="lg:col-span-4 xl:col-span-3">
                <div className="space-y-6">
                    <Skeleton className="h-[300px] w-full rounded-3xl" />
                    <div className="space-y-4 rounded-2xl border border-border bg-background p-5">
                        <div className="flex items-center gap-4">
                            <Skeleton className="size-12 rounded-2xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main List Skeleton */}
            <section className="lg:col-span-8 xl:col-span-9">
                <div className="rounded-3xl border border-border bg-background shadow-sm">
                    <div className="divide-y divide-border">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-start gap-5 px-5 py-6">
                                <Skeleton className="size-14 shrink-0 rounded-2xl" />
                                <div className="flex-1 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <Skeleton className="h-6 w-2/3" />
                                        <Skeleton className="h-5 w-5" />
                                    </div>
                                    <div className="flex justify-between">
                                        <Skeleton className="h-4 w-20" />
                                        <Skeleton className="h-4 w-12" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
