import Link from "next/link";
import { getPosts } from "@/lib/api";
import { Badge, Card, CardBody } from "@/app/_components/ui";

export const metadata = {
  title: "Blog | myblog",
};

export const dynamic = "force-dynamic";

export default async function BlogIndexPage() {
  const posts = await getPosts({ type: "blog" });
  const categoryCounts = posts.reduce<Record<string, number>>((acc, post) => {
    const key = post.categorySlug?.trim();
    if (!key) return acc;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const categories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <h1 className="text-4xl font-black tracking-tight md:text-5xl">Blog</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted">
          Thoughts, tutorials, and insights on development. Deep dives into the
          modern web stack.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <Card>
            <CardBody className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">
                  Categories
                </p>
                <div className="space-y-2">
                  <Link
                    href="/blog"
                    className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground hover:bg-surface-2"
                  >
                    <span>All Posts</span>
                    <span className="text-xs text-muted">{posts.length}</span>
                  </Link>
                  {categories.map(([slug, count]) => (
                    <Link
                      key={slug}
                      href={`/blog/category/${slug}`}
                      className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-foreground"
                    >
                      <span className="truncate">{slug}</span>
                      <span className="text-xs text-muted">{count}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">
                  Popular Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Next.js", "TypeScript", "Tailwind", "Design", "System"].map(
                    (tag) => (
                      <span
                        key={tag}
                        className="rounded-xl border border-border bg-surface px-3 py-1 text-xs font-medium text-muted"
                      >
                        {tag}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        </aside>

        <main className="lg:col-span-9">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <p className="text-lg font-semibold text-foreground">
              Latest Posts{" "}
              <span className="ml-2 text-sm font-normal text-muted">
                ({posts.length})
              </span>
            </p>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted">Sort by:</span>
              <select className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none">
                <option>Newest First</option>
                <option>Oldest First</option>
              </select>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {posts.length ? (
              posts.map((post) => (
                <Card
                  key={post.id}
                  className="group overflow-hidden transition hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                >
                  <Link href={`/blog/${post.slug}`} className="block">
                    <div className="relative aspect-video w-full overflow-hidden bg-surface-2">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent opacity-60 transition group-hover:opacity-40" />
                      <div className="absolute left-4 top-4">
                        <Badge variant="primary">
                          {post.categorySlug?.toUpperCase() ?? "BLOG"}
                        </Badge>
                      </div>
                    </div>
                    <CardBody className="space-y-3">
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span>
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-muted/60" />
                        <span>{post.visibility}</span>
                      </div>
                      <h3 className="text-lg font-bold leading-tight text-foreground transition group-hover:text-primary">
                        {post.title}
                      </h3>
                      <p className="line-clamp-3 text-sm leading-6 text-muted">
                        {post.content}
                      </p>
                    </CardBody>
                  </Link>
                </Card>
              ))
            ) : (
              <Card className="md:col-span-2">
                <CardBody>
                  <p className="text-sm text-muted">No posts yet.</p>
                </CardBody>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
