import Link from "next/link";
import Image from "next/image";
import { FiLock, FiGlobe } from "react-icons/fi";
import CategorySettingsModal from "@/app/article/CategorySettingsModal";
import type { Post } from "@/lib/types";
import { getPublicPosts, getPublicPostCounts } from "@/lib/server/publicPosts";
import { getCurrentUser, isAdminDb } from "@/lib/server/admin";
import { getPostsDirectly } from "@/lib/server/posts";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toExcerpt } from "@/lib/markdown";
import { notFound } from "next/navigation";
import CategorySelect from "./CategorySelect";

export const metadata = {
  title: "아티클",
};

export const revalidate = 86400; // REVALIDATE_PERIOD

function coverSrcFromImageKey(key: string) {
  const [bucket, ...rest] = key.split(":");
  const objectPath = rest.join(":");
  const looksLikeSupabaseKey = Boolean(bucket && objectPath);
  if (!looksLikeSupabaseKey) return key;

  if (bucket === "post-images-public") {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!base) return null;
    const path = encodeURIComponent(objectPath).replaceAll("%2F", "/");
    return `${base}/storage/v1/object/public/${bucket}/${path}`;
  }

  return `/api/images?bucket=${encodeURIComponent(
    bucket
  )}&path=${encodeURIComponent(objectPath)}`;
}

function LockIcon({ className }: { className?: string }) {
  return <FiLock className={className ?? "size-5"} />;
}

function PublishedIcon({ className }: { className?: string }) {
  return <FiGlobe className={className ?? "size-5"} />;
}

function CommentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "size-4"}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BlogIndexPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  const isAdmin = await isAdminDb(user);
  const sp = (await searchParams) ?? {};
  const selectedCategory =
    typeof sp.category === "string" ? sp.category.trim() : "";
  const page =
    typeof sp.page === "string" && Number(sp.page) > 0 ? Number(sp.page) : 1;
  const LIMIT = 12;

  let posts: Post[] = [];
  let totalCount = 0;
  let categoryCounts: Record<string, number> = {};
  let sidebarTotalCount = 0;

  if (isAdmin) {
    // Admin: Fetch all for existing logic compatibility (and consistent counts)

    // Calculate counts from ALL posts (including private)
    // Note: getPosts only returns filtered by category if provided.
    // To get SIDEBAR counts correctly for Admin, we actually need to fetch ALL posts regardless of category?
    // The original code fetched "getPosts({ type: 'blog' })" regardless of selection, then filtered in memory.
    // Let's replicate that to ensure sidebar counts are correct.
    const allVisiblePosts = await getPostsDirectly({ type: "blog", user });
    sidebarTotalCount = allVisiblePosts.length;

    categoryCounts = allVisiblePosts.reduce<Record<string, number>>(
      (acc, post) => {
        const key = post.categorySlug?.trim();
        if (!key) return acc;
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {}
    );

    const filtered = selectedCategory
      ? allVisiblePosts.filter(
        (p) => (p.categorySlug ?? "").trim() === selectedCategory
      )
      : allVisiblePosts;

    totalCount = filtered.length;
    const start = (page - 1) * LIMIT;
    posts = filtered.slice(start, start + LIMIT);
  } else {
    // Public: Optimized fetching
    // 1. Fetch Counts (Lightweight) - returns { counts, total }
    const { counts, total } = await getPublicPostCounts("blog");
    categoryCounts = counts;
    sidebarTotalCount = total;

    // 2. Fetch Paginated Posts
    const { data, count } = await getPublicPosts({
      type: "blog",
      category: selectedCategory,
      page,
      limit: LIMIT,
    });
    posts = data;
    totalCount = count;
  }

  // Categories Sidebar Logic
  const supabase = await createSupabaseServerClient();
  const { data: categoryRows } = await supabase
    .from("categories")
    .select("slug,visibility,sort_order")
    .order("sort_order", { ascending: true })
    .order("slug", { ascending: true });

  const fromDb = (categoryRows ?? []).map((row) => ({
    slug: row.slug,
    visibility: row.visibility as "public" | "private",
    sortOrder: Number(row.sort_order ?? 0),
  }));
  const existing = new Set(fromDb.map((c) => c.slug));
  const missing = isAdmin
    ? Object.keys(categoryCounts)
      .filter((slug) => !existing.has(slug))
      .map((slug) => ({
        slug,
        visibility: "public" as const,
        sortOrder: 1_000_000,
      }))
    : [];

  const categories = [...fromDb, ...missing].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug, "ko")
  );

  if (
    !isAdmin &&
    selectedCategory &&
    !categories.some((c) => c.slug === selectedCategory)
  ) {
    notFound();
  }

  const totalPages = Math.ceil(totalCount / LIMIT);
  const baseUrl = `/article?${selectedCategory ? `category=${encodeURIComponent(selectedCategory)}&` : ""
    }`;

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
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
              href="/article"
              className={[
                "group flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all duration-200",
                selectedCategory
                  ? "text-muted hover:bg-surface-2 hover:text-foreground"
                  : "bg-primary/10 text-primary shadow-sm shadow-primary/5",
              ].join(" ")}
            >
              <span className="text-sm font-bold">전체 글</span>
              <span
                className={[
                  "inline-flex items-center justify-center min-w-7 h-5 px-1.5 rounded-lg text-[10px] font-black transition-colors",
                  selectedCategory
                    ? "text-muted/40 group-hover:text-muted/60"
                    : "text-primary/60",
                ].join(" ")}
              >
                {sidebarTotalCount}
              </span>
            </Link>
            {categories.map((category) => {
              const isActive = category.slug === selectedCategory;
              return (
                <Link
                  key={category.slug}
                  href={`/article?category=${encodeURIComponent(category.slug)}`}
                  className={[
                    "group flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm shadow-primary/5"
                      : "text-muted hover:bg-surface-2 hover:text-foreground",
                  ].join(" ")}
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm font-bold">
                    {isAdmin && category.visibility === "private" ? (
                      <span className="text-amber-500/90" aria-hidden>
                        <FiLock className="size-3" />
                      </span>
                    ) : null}
                    <span className="truncate">{category.slug}</span>
                  </span>
                  <span
                    className={[
                      "inline-flex items-center justify-center min-w-7 h-5 px-1.5 rounded-lg text-[10px] font-black transition-colors",
                      isActive
                        ? "text-primary/60"
                        : "text-muted/40 group-hover:text-muted/60",
                    ].join(" ")}
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
            <Link
              href="/article/write"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110"
            >
              아티클 쓰기
            </Link>
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
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {posts.map((post, index) => {
                const createdAt = new Date(post.createdAt);
                const dateLabel = createdAt.toISOString().slice(0, 10);
                const coverKey =
                  post.thumbnailImageKey?.trim() || post.imageKeys?.[0] || null;
                const coverSrc = coverKey
                  ? coverSrcFromImageKey(coverKey)
                  : null;

                return (
                  <div key={post.id} className="group h-full">
                    <Link
                      href={`/article/${post.slug}`}
                      className="block h-full"
                      prefetch={false}
                    >
                      <article className="relative overflow-hidden rounded-3xl border border-border bg-surface shadow-sm transition hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 h-full flex flex-col">
                        <div className="p-5 flex flex-col h-full">
                          <div className="flex items-center justify-between">
                            <span className="truncate text-xs font-bold text-muted transition-colors group-hover:text-primary">
                              {post.categorySlug || "전체"}
                            </span>
                            <div className="shrink-0">
                              {post.visibility === "private" ? (
                                <div className="text-amber-500">
                                  <LockIcon className="size-4" />
                                </div>
                              ) : (
                                <div className="text-emerald-500">
                                  <PublishedIcon className="size-4" />
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface-2 relative h-44 w-full">
                            {coverSrc ? (
                              <Image
                                src={coverSrc}
                                alt=""
                                fill
                                sizes="(min-width: 1280px) 30vw, (min-width: 640px) 50vw, 100vw"
                                className="object-cover transition duration-300 group-hover:scale-[1.02]"
                                priority={index === 0}
                              />
                            ) : (
                              <div className="absolute inset-0 bg-[radial-gradient(70%_70%_at_50%_35%,rgba(19,91,236,0.35)_0%,rgba(147,51,234,0.18)_50%,rgba(16,22,34,0)_100%)]" />
                            )}
                          </div>

                          <div className="mt-4 space-y-2 flex-1">
                            <h2 className="text-xl font-black leading-snug text-foreground transition group-hover:text-primary">
                              {post.title}
                            </h2>
                            <p className="line-clamp-3 text-sm leading-6 text-muted">
                              {toExcerpt(post.content)}
                            </p>
                          </div>

                          <div className="mt-5 flex items-center justify-between gap-3 text-xs text-muted">
                            <div className="flex items-center gap-3">
                              {(post.commentCount ?? 0) > 0 && (
                                <span className="flex items-center gap-1 text-primary/80">
                                  <CommentIcon className="size-3.5" />
                                  <span className="font-bold">{post.commentCount}</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-muted/60">
                                {dateLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                      </article>
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 ? (
              <div className="mt-12 flex justify-center gap-2">
                <Link
                  href={page > 1 ? `${baseUrl}page=${page - 1}` : "#"}
                  className={`px-4 py-2 rounded-xl border border-border bg-surface text-sm font-medium transition hover:bg-surface-2 ${page <= 1 ? "pointer-events-none opacity-50" : ""
                    }`}
                >
                  이전
                </Link>
                <span className="flex items-center px-4 text-sm font-medium text-muted">
                  {page} / {totalPages}
                </span>
                <Link
                  href={page < totalPages ? `${baseUrl}page=${page + 1}` : "#"}
                  className={`px-4 py-2 rounded-xl border border-border bg-surface text-sm font-medium transition hover:bg-surface-2 ${page >= totalPages ? "pointer-events-none opacity-50" : ""
                    }`}
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
