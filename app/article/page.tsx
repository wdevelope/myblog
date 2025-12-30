import Link from "next/link";
import DeletePostButton from "@/app/_components/DeletePostButton";
import { getPublicPosts } from "@/lib/server/publicPosts";
import { getPosts } from "@/lib/api";
import { getCurrentUser, isAdminDb } from "@/lib/server/admin";

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

  return `/api/images?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(objectPath)}`;
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

export default async function BlogIndexPage() {
  const user = await getCurrentUser();
  const isAdmin = await isAdminDb(user);
  const posts = isAdmin
    ? await getPosts({ type: "blog" })
    : await getPublicPosts({ type: "blog" });

  const categoryCounts = posts.reduce<Record<string, number>>((acc, post) => {
    const key = post.categorySlug?.trim();
    if (!key) return acc;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const categories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      {/* Left sidebar - Categories */}
      <aside className="lg:col-span-4 lg:col-start-1 lg:self-start lg:sticky lg:top-20 xl:col-span-3 xl:col-start-1">
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-primary">전체 카테고리</h3>
          <nav className="space-y-1">
            <Link
              href="/article"
              className="flex items-center justify-between py-2 text-sm text-foreground hover:text-primary transition"
            >
              <span className="font-medium">전체 글</span>
              <span className="text-xs text-muted">{posts.length}</span>
            </Link>
            {categories.map(([slug]) => (
              <Link
                key={slug}
                href={`/article/category/${slug}`}
                className="flex items-center justify-between py-2 text-sm text-muted hover:text-foreground transition"
              >
                <div className="flex items-center gap-2">
                  <span>{slug}</span>
                  <svg
                    className="size-3.5 text-muted/60"
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
                </div>
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main content - Post list */}
      <main className="lg:col-span-8 lg:col-start-5 xl:col-span-9 xl:col-start-4">
        <header className="mb-6 flex items-end justify-between gap-4 border-b border-border pb-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              아티클
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
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => {
              const createdAt = new Date(post.createdAt);
              const dateLabel = createdAt.toISOString().slice(0, 10);
              const coverSrc = post.imageKeys?.[0]
                ? coverSrcFromImageKey(post.imageKeys[0])
                : null;

              return (
                <div key={post.id} className="group">
                  <Link href={`/article/${post.slug}`} className="block">
                    <article className="relative overflow-hidden rounded-3xl border border-border bg-surface shadow-sm transition hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10">
                      <div className="p-5">
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

                        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface-2">
                          {coverSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={coverSrc}
                              alt=""
                              className="h-44 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-44 w-full bg-[radial-gradient(70%_70%_at_50%_35%,rgba(19,91,236,0.35)_0%,rgba(147,51,234,0.18)_50%,rgba(16,22,34,0)_100%)]" />
                          )}
                        </div>

                        <div className="mt-4 space-y-2">
                          <h2 className="text-xl font-black leading-snug text-foreground transition group-hover:text-primary">
                            {post.title}
                          </h2>
                          <p className="line-clamp-3 text-sm leading-6 text-muted">
                            {post.content}
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

                  {isAdmin ? (
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <Link
                        href={`/article/edit/${post.slug}`}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-surface px-3 text-sm font-bold text-foreground transition hover:bg-surface-2"
                      >
                        수정
                      </Link>
                      <DeletePostButton
                        slug={post.slug}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-surface px-3 text-sm font-bold text-foreground transition hover:bg-surface-2"
                      >
                        삭제
                      </DeletePostButton>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="text-sm text-muted">아직 아티클이 없습니다.</p>
          </div>
        )}
      </main>
    </div>
  );
}
