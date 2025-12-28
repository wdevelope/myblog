import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "myblog",
  description: "Personal blog",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-dvh bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
          <header className="sticky top-0 z-10 border-b border-black/5 bg-zinc-50/90 backdrop-blur dark:border-white/10 dark:bg-black/50">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
              <Link href="/" className="font-semibold tracking-tight">
                myblog
              </Link>
              <nav className="flex items-center gap-4 text-sm text-zinc-700 dark:text-zinc-300">
                <Link
                  href="/blog"
                  className="hover:text-zinc-950 dark:hover:text-zinc-50"
                >
                  Blog
                </Link>
                <Link
                  href="/feed"
                  className="hover:text-zinc-950 dark:hover:text-zinc-50"
                >
                  Feed
                </Link>
                <Link
                  href="/diary"
                  className="hover:text-zinc-950 dark:hover:text-zinc-50"
                >
                  Diary
                </Link>
                <Link
                  href="/admin"
                  className="rounded-full bg-black px-3 py-1 text-zinc-50 hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  Admin
                </Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto w-full max-w-5xl px-4 py-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
