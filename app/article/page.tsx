import Link from "next/link";
import Image from "next/image";
import CategorySettingsModal from "@/app/article/CategorySettingsModal";
import type { Post } from "@/lib/types";
import { getPublicPosts, getPublicPostCounts } from "@/lib/server/publicPosts";
import { getCurrentUser, isAdminDb } from "@/lib/server/admin";
import { getPostsDirectly } from "@/lib/server/posts";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toExcerpt } from "@/lib/markdown";
import { notFound } from "next/navigation";

export const metadata = {
  title: "아티클",
};

export const revalidate = 60;

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
  return (
    <svg
      className={className ?? "size-5"}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

function PublishedIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "size-5"}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M19.5 12c0 3.866-3.134 7-7 7s-7-3.134-7-7 3.134-7 7-7c.85 0 1.664.15 2.417.425"
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
    <div className="grid gap-8 lg:grid-cols-12">
      {/* Left sidebar - Categories */}
      <aside className="lg:col-span-3 lg:col-start-1 lg:self-start lg:sticky lg:top-20 xl:col-span-3 xl:col-start-1">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-primary">전체 카테고리</h3>
            {isAdmin ? <CategorySettingsModal /> : null}
          </div>
          <nav className="space-y-1">
            <Link
              href="/article"
              className={[
                "flex items-center justify-between py-2 text-sm transition",
                selectedCategory
                  ? "text-muted hover:text-foreground"
                  : "text-foreground hover:text-primary",
              ].join(" ")}
            >
              <span className="font-medium">전체 글</span>
              <span className="text-xs text-muted">{sidebarTotalCount}</span>
            </Link>
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/article?category=${encodeURIComponent(category.slug)}`}
                className={[
                  "flex items-center justify-between py-2 text-sm transition",
                  category.slug === selectedCategory
                    ? "text-foreground"
                    : "text-muted hover:text-foreground",
                ].join(" ")}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {isAdmin && category.visibility === "private" ? (
                    <span className="text-xs text-amber-500/80" aria-hidden>
                      🔒
                    </span>
                  ) : null}
                  <span className="truncate">{category.slug}</span>
                </span>
                <span className="text-xs text-muted">
                  {categoryCounts[category.slug] ?? 0}
                </span>
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main content - Post list */}
      <main className="lg:col-span-9 lg:col-start-4 xl:col-span-9 xl:col-start-4">
        <header className="mb-6 flex items-end justify-between gap-4 border-b border-border pb-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              {selectedCategory ? `아티클 · ${selectedCategory}` : "아티클"}
            </h1>
            <p className="text-sm text-muted">조금 긴 글과 정리된 기록.</p>
          </div>
          {isAdmin ? (
            <Link
              href="/article/write"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110"
            >
              아티클 쓰기
            </Link>
          ) : null}
        </header>
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
                    >
                      <article className="relative overflow-hidden rounded-3xl border border-border bg-surface shadow-sm transition hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 h-full flex flex-col">
                        <div className="p-5 flex flex-col h-full">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex rounded-xl bg-primary/15 px-3 py-1 text-xs font-bold text-primary ring-1 ring-primary/20">
                              {dateLabel}
                            </span>
                            <div className="text-muted/80">
                              {post.visibility === "private" ? (
                                <LockIcon className="size-5" />
                              ) : (
                                <PublishedIcon className="size-5 text-emerald-400/80" />
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
                            <div className="flex items-center gap-2">
                              <span
                                className={[
                                  "size-2 rounded-full",
                                  post.visibility === "private"
                                    ? "bg-amber-400/80"
                                    : "bg-emerald-400/80",
                                ].join(" ")}
                              />
                              <span>
                                {post.visibility === "private"
                                  ? "비공개"
                                  : "게시됨"}
                              </span>
                            </div>
                            {post.categorySlug ? (
                              <span className="truncate font-semibold text-muted/90">
                                {post.categorySlug}
                              </span>
                            ) : null}
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
