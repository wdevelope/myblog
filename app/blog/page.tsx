import Link from "next/link";
import { getPosts } from "@/lib/api";

export const metadata = {
  title: "Blog | myblog",
};

export const dynamic = "force-dynamic";

export default async function BlogIndexPage() {
  const posts = await getPosts({ type: "blog" });

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Blog</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Categorized posts (public).
        </p>
      </header>

      <div className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        {posts.length ? (
          <ul className="space-y-3">
            {posts.map((post) => (
              <li key={post.id} className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="font-medium underline underline-offset-4"
                  >
                    {post.title}
                  </Link>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {post.categorySlug} · {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-black/10 px-2 py-1 text-xs dark:border-white/15">
                  {post.visibility}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No posts yet.</p>
        )}
      </div>
    </div>
  );
}
