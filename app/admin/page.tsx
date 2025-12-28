import Link from "next/link";
import { getPosts } from "@/lib/api";
import AdminEditor from "@/app/admin/AdminEditor";

export const metadata = {
  title: "Admin | myblog",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [blog, feed, diary] = await Promise.all([
    getPosts({ type: "blog" }),
    getPosts({ type: "feed" }),
    getPosts({ type: "diary" }),
  ]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Protected area for writing posts.
        </p>
      </header>

      <div className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <AdminEditor />
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/auth/logout"
            className="text-sm font-medium underline underline-offset-4"
          >
            Sign out
          </Link>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <h2 className="font-semibold">Blog</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {blog.length} posts
          </p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <h2 className="font-semibold">Feed</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {feed.length} posts
          </p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <h2 className="font-semibold">Diary</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {diary.length} entries
          </p>
        </div>
      </section>
    </div>
  );
}
