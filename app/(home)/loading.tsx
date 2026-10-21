import { Skeleton, Card, CardBody } from "@/app/_components/ui";

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

            {/* Latest Articles Section Skeleton */}
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
        </div>
    );
}
