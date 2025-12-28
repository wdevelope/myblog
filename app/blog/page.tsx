import Link from "next/link";
import { getPublicPosts } from "@/lib/server/publicPosts";

export const metadata = {
  title: "블로그",
};

export const revalidate = 60;

export default async function BlogIndexPage() {
  const posts = await getPublicPosts({ type: "blog" });
  const categoryCounts = posts.reduce<Record<string, number>>((acc, post) => {
    const key = post.categorySlug?.trim();
    if (!key) return acc;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const categories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      {/* Main content - Post list */}
      <main className="lg:col-span-8 lg:col-start-5 xl:col-span-9 xl:col-start-4">
        <div className="divide-y divide-border">
          {posts.length ? (
            posts.map((post) => (
              <article key={post.id} className="py-6 first:pt-0">
                <Link
                  href={`/blog/${post.slug}`}
                  className="group block space-y-2"
                >
                  <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition">
                    {post.title}
                  </h2>
                  <p className="text-sm leading-relaxed text-muted line-clamp-2">
                    {post.content}
                  </p>
                </Link>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted">
                  <span>
                    {new Date(post.createdAt)
                      .toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })
                      .replace(/\. /g, ".")
                      .replace(/\.$/, "")}
                  </span>
                  <div className="flex items-center gap-1">
                    <svg
                      className="size-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z"
                      />
                    </svg>
                    <span>0</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg
                      className="size-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"
                      />
                    </svg>
                    <span>0</span>
                  </div>
                  {post.visibility === "private" && (
                    <svg
                      className="size-4"
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
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-muted">아직 글이 없습니다.</p>
            </div>
          )}
        </div>
      </main>

      {/* Left sidebar - Categories */}
      <aside className="lg:col-span-4 lg:col-start-1 xl:col-span-3 xl:col-start-1">
        <div className="sticky top-6 space-y-4">
          <h3 className="text-sm font-bold text-primary">전체 카테고리</h3>
          <nav className="space-y-1">
            <Link
              href="/blog"
              className="flex items-center justify-between py-2 text-sm text-foreground hover:text-primary transition"
            >
              <span className="font-medium">전체 글</span>
              <span className="text-xs text-muted">{posts.length}</span>
            </Link>
            {categories.map(([slug]) => (
              <Link
                key={slug}
                href={`/blog/category/${slug}`}
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
    </div>
  );
}
