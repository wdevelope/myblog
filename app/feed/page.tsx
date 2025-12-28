import Link from "next/link";
import { getPublicPosts } from "@/lib/server/publicPosts";
import { Badge, ButtonLink, Card, CardBody } from "@/app/_components/ui";

export const metadata = {
  title: "Feed | myblog",
};

export const revalidate = 60;

export default async function FeedPage() {
  const posts = await getPublicPosts({ type: "feed" });
  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <h1 className="text-4xl font-black tracking-tight md:text-5xl">Feed</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted">
          Micro-updates, thoughts, and code snippets.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-12">
        <main className="space-y-4 lg:col-span-8">
          {posts.length ? (
            posts.map((post) => (
              <Card
                key={post.id}
                className="overflow-hidden transition hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
              >
                <CardBody className="flex flex-col gap-4 md:flex-row md:items-stretch">
                  <div className="flex flex-1 flex-col justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <span className="font-mono">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-muted/60" />
                      <Badge variant={post.visibility === "public" ? "primary" : "warning"}>
                        {post.visibility === "public" ? "Public" : "Private"}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <Link
                        href={`/feed/${post.slug}`}
                        className="text-xl font-bold leading-tight text-foreground hover:text-primary"
                      >
                        {post.title}
                      </Link>
                      <p className="line-clamp-3 text-sm leading-6 text-muted">
                        {post.content}
                      </p>
                    </div>
                    <div className="pt-1">
                      <Link
                        href={`/feed/${post.slug}`}
                        className="text-sm font-bold text-primary hover:opacity-90"
                      >
                        Read →
                      </Link>
                    </div>
                  </div>
                  <div className="h-28 w-full shrink-0 rounded-2xl bg-surface-2 ring-1 ring-border md:h-auto md:w-48" />
                </CardBody>
              </Card>
            ))
          ) : (
            <Card>
              <CardBody>
                <p className="text-sm text-muted">No feed items yet.</p>
              </CardBody>
            </Card>
          )}
          <div className="pt-4 text-center">
            <button className="h-10 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:bg-surface-2">
              Load More
            </button>
          </div>
        </main>

        <aside className="space-y-6 lg:col-span-4">
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-[radial-gradient(circle_at_30%_30%,rgba(19,91,236,0.6),rgba(147,51,234,0.25),rgba(16,22,34,0.2))] ring-1 ring-border" />
                <div>
                  <p className="font-bold text-foreground">Alex Developer</p>
                  <p className="text-sm text-muted">Full Stack Engineer</p>
                </div>
              </div>
              <p className="text-sm leading-6 text-muted">
                Building digital products and sharing the journey. Specialized in
                React, Node.js, and Cloud Architecture.
              </p>
              <div className="flex items-center gap-3 text-sm text-muted">
                <span className="rounded-lg border border-border bg-surface px-2 py-1">
                  GitHub
                </span>
                <span className="rounded-lg border border-border bg-surface px-2 py-1">
                  Twitter
                </span>
                <span className="rounded-lg border border-border bg-surface px-2 py-1">
                  RSS
                </span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">
                Popular Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {["#React", "#NextJS", "#TypeScript", "#DesignSystem", "#Life"].map(
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
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-3">
              <p className="text-sm font-bold text-foreground">
                Subscribe to updates
              </p>
              <p className="text-sm text-muted">
                Get the latest posts delivered to your inbox.
              </p>
              <div className="flex gap-2">
                <input
                  className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary/60"
                  placeholder="Email address"
                />
                <ButtonLink href="/feed">→</ButtonLink>
              </div>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
