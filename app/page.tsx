import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
        <h1 className="text-3xl font-semibold tracking-tight">myblog</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Blog / Feed / Diary with per-post visibility.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/blog"
            className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Browse Blog
          </Link>
          <Link
            href="/feed"
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-white/15 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          >
            Open Feed
          </Link>
          <Link
            href="/auth/login"
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-white/15 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          >
            Sign in (Cognito)
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <h2 className="font-semibold">Blog</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Categorized posts with SEO-friendly pages.
          </p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <h2 className="font-semibold">Feed</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Short updates with images and comments.
          </p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <h2 className="font-semibold">Diary</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Private-by-default entries, no comments.
          </p>
        </div>
      </section>
    </div>
  );
}
