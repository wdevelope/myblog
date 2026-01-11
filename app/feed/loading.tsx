import { Skeleton, Card } from "@/app/_components/ui";

export default function FeedLoading() {
    return (
        <div className="mx-auto max-w-xl space-y-8 pt-4">
            <div className="space-y-7">
                {[...Array(3)].map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                        {/* Header Skeleton */}
                        <div className="flex items-center gap-3 border-b border-border p-4">
                            <Skeleton className="size-10 rounded-full" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                        </div>

                        {/* Image Area Skeleton */}
                        <Skeleton className="aspect-square w-full rounded-none" />

                        {/* Content Area Skeleton */}
                        <div className="p-4 space-y-4">
                            <div className="flex justify-between">
                                <div className="flex gap-4">
                                    <Skeleton className="size-6 rounded-md" />
                                    <Skeleton className="size-6 rounded-md" />
                                </div>
                                <Skeleton className="size-6 rounded-md" />
                            </div>
                            <Skeleton className="h-4 w-20" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-2/3" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
