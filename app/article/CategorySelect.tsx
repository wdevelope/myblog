"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { articleListHref } from "@/lib/constants";

interface Category {
    slug: string;
    visibility: "public" | "private";
}

interface CategorySelectProps {
    categories: Category[];
    selectedCategory: string;
    categoryCounts: Record<string, number>;
    totalCount: number;
}

export default function CategorySelect({
    categories,
    selectedCategory,
    categoryCounts,
    totalCount,
}: CategorySelectProps) {
    const router = useRouter();

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        router.push(articleListHref(value === "all" ? null : value));
    };

    return (
        <div className="lg:hidden mb-6">
            <label htmlFor="category-select" className="sr-only">
                카테고리 선택
            </label>
            <div className="relative">
                <select
                    id="category-select"
                    value={selectedCategory || "all"}
                    onChange={handleChange}
                    className="h-12 w-full appearance-none rounded-xl border border-border bg-surface px-4 pr-10 text-base font-bold text-foreground sm:text-sm outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
                >
                    <option value="all">전체 글 ({totalCount})</option>
                    {categories.map((category) => (
                        <option key={category.slug} value={category.slug}>
                            {category.slug} ({categoryCounts[category.slug] ?? 0})
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted">
                    <ChevronDown className="size-5" aria-hidden />
                </div>
            </div>
        </div>
    );
}
