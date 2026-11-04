import Link from "next/link";
import CategorySettingsModal from "@/app/article/CategorySettingsModal";
import ArticleListItem from "@/app/article/ArticleListItem";
import VisibilityIcon from "@/app/_components/VisibilityIcon";
import type { Post } from "@/lib/types";
import {
  getPublicCategories,
  getPublicPostCounts,
  getPublicPosts,
} from "@/lib/server/publicPosts";
import { getPreviewViewer } from "@/lib/server/admin";
import { getArticleListDirectly } from "@/lib/server/posts";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { articleListHref } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { notFound } from "next/navigation";
import CategorySelect from "@/app/article/CategorySelect";
import { RememberArticleList } from "@/app/article/ArticleListMemory";
import { ButtonLink, buttonClass } from "@/app/_components/ui";

const LIMIT = 12;

type Category = { slug: string; visibility: "public" | "private"; sortOrder: number };

// /article, /article/page/[page], /article/category/[slug](/page/[page])가 함께 쓰는 목록 화면.
// 방문자는 쿠키 없는 공개 캐시만 읽어 정적으로 남고, 관리자는 draft mode에서 비공개 글·카테고리까지 본다.
export default async function ArticleIndex({
  category: selectedCategory = "",
  page,
}: {
  category?: string;
  page: number;
}) {
  const { isAdmin } = await getPreviewViewer();

  let posts: Post[] = [];
  let totalCount = 0;
  let categoryCounts: Record<string, number> = {};
  let sidebarTotalCount = 0;
  let categories: Category[] = [];

  if (isAdmin) {
    const [{ data, count, counts, total }, adminCategories] = await Promise.all([
      getArticleListDirectly({ category: selectedCategory, page, limit: LIMIT }),
      getAdminCategories(),
    ]);
    categoryCounts = counts;
    sidebarTotalCount = total;
    posts = data;
    totalCount = count;

    // 글에는 있는데 카테고리 행이 없는 이름도 관리자에게는 보여 정리할 수 있게 한다.
    const existing = new Set(adminCategories.map((c) => c.slug));
    const missing = Object.keys(categoryCounts)
      .filter((slug) => !existing.has(slug))
      .map((slug) => ({ slug, visibility: "public" as const, sortOrder: 1_000_000 }));
    categories = [...adminCategories, ...missing];
  } else {
    // 개수·목록·카테고리는 서로 기다릴 필요가 없어 한 번에 요청한다.
    const [{ counts, total }, { data, count }, publicCategories] = await Promise.all([
      getPublicPostCounts("blog"),
      getPublicPosts({ type: "blog", category: selectedCategory, page, limit: LIMIT }),
      getPublicCategories(),
    ]);
    categoryCounts = counts;
    sidebarTotalCount = total;
    posts = data;
    totalCount = count;
    categories = publicCategories.map((c) => ({ ...c, visibility: "public" as const }));
  }

  categories.sort(
    (a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug, "ko")
  );

  if (selectedCategory && !categories.some((c) => c.slug === selectedCategory)) {
    notFound();
  }
  // 없는 쪽 번호는 빈 목록 대신 404다.
  if (page > 1 && posts.length === 0) notFound();

  const totalPages = Math.ceil(totalCount / LIMIT);

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
      <RememberArticleList href={articleListHref(selectedCategory, page)} />
      {/* Left sidebar - Categories */}
      <aside className="hidden lg:block lg:col-span-2 lg:col-start-1 lg:sticky lg:top-24 xl:col-span-2 xl:col-start-1">
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted/60">
              전체 카테고리
            </h3>
            {isAdmin ? <CategorySettingsModal /> : null}
          </div>
          <nav className="flex flex-col gap-1.5">
            <Link
              href={articleListHref()}
              className={cn(
                "group flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all duration-200",
                selectedCategory
                  ? "text-muted hover:bg-surface-2 hover:text-foreground"
                  : "bg-primary/10 text-primary shadow-sm shadow-primary/5",
              )}
            >
              <span className="text-sm font-bold">전체 글</span>
              <span
                className={cn(
                  "inline-flex items-center justify-center min-w-7 h-5 px-1.5 rounded-lg text-[10px] font-black transition-colors",
                  selectedCategory
                    ? "text-muted/40 group-hover:text-muted/60"
                    : "text-primary/60",
                )}
              >
                {sidebarTotalCount}
              </span>
            </Link>
            {categories.map((category) => {
              const isActive = category.slug === selectedCategory;
              return (
                <Link
                  key={category.slug}
                  href={articleListHref(category.slug)}
                  className={cn(
                    "group flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm shadow-primary/5"
                      : "text-muted hover:bg-surface-2 hover:text-foreground",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm font-bold">
                    {isAdmin && category.visibility === "private" ? (
                      <VisibilityIcon visibility="private" className="size-3" />
                    ) : null}
                    <span className="truncate">{category.slug}</span>
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center justify-center min-w-7 h-5 px-1.5 rounded-lg text-[10px] font-black transition-colors",
                      isActive
                        ? "text-primary/60"
                        : "text-muted/40 group-hover:text-muted/60",
                    )}
                  >
                    {categoryCounts[category.slug] ?? 0}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main content - Post list */}
      <main className="lg:col-span-10 lg:col-start-3 xl:col-span-10 xl:col-start-3">
        <header className={isAdmin ? "mb-6 flex items-center justify-end" : ""}>
          {isAdmin ? (
            <ButtonLink
              href="/article/write"
            >
              아티클 쓰기
            </ButtonLink>
          ) : null}
        </header>

        {/* [NEW] Mobile Category Select */}
        <CategorySelect
          categories={categories}
          selectedCategory={selectedCategory}
          categoryCounts={categoryCounts}
          totalCount={sidebarTotalCount}
        />

        {posts.length ? (
          <>
            <ul className="divide-y divide-border border-y border-border">
              {posts.map((post, index) => (
                <ArticleListItem key={post.id} post={post} priority={index === 0} />
              ))}
            </ul>

            {/* Pagination Controls */}
            {totalPages > 1 ? (
              <div className="mt-12 flex justify-center gap-2">
                <Link
                  href={page > 1 ? articleListHref(selectedCategory, page - 1) : "#"}
                  className={buttonClass({
                    variant: "secondary",
                    size: "sm",
                    className: cn("px-4 font-medium", page <= 1 && "pointer-events-none opacity-50"),
                  })}
                >
                  이전
                </Link>
                <span className="flex items-center px-4 text-sm font-medium text-muted">
                  {page} / {totalPages}
                </span>
                <Link
                  href={page < totalPages ? articleListHref(selectedCategory, page + 1) : "#"}
                  className={buttonClass({
                    variant: "secondary",
                    size: "sm",
                    className: cn("px-4 font-medium", page >= totalPages && "pointer-events-none opacity-50"),
                  })}
                >
                  다음
                </Link>
              </div>
            ) : null}
          </>
        ) : (
          <div className="py-16 text-center">
            <p className="text-sm text-muted">아직 아티클이 없습니다.</p>
          </div>
        )}
      </main>
    </div>
  );
}

async function getAdminCategories(): Promise<Category[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("categories")
    .select("slug,visibility,sort_order")
    .order("sort_order", { ascending: true })
    .order("slug", { ascending: true });

  return (data ?? []).map((row) => ({
    slug: row.slug,
    visibility: row.visibility as "public" | "private",
    sortOrder: Number(row.sort_order ?? 0),
  }));
}
