import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-8 text-sm text-muted">
        <p>© {new Date().getFullYear()} DevLog</p>
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <Link href="/blog" className="hover:text-foreground">
            Blog
          </Link>
          <Link href="/feed" className="hover:text-foreground">
            Feed
          </Link>
        </div>
      </div>
    </footer>
  );
}

