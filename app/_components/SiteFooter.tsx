import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-8 text-sm text-muted">
        <p>© {new Date().getFullYear()} 인생일지</p>
        <div className="flex items-center gap-4">
          <Link href="/feed" className="hover:text-foreground">
            피드
          </Link>
          <Link href="/blog" className="hover:text-foreground">
            아티클
          </Link>
          <Link href="/diary" className="hover:text-foreground">
            일기
          </Link>
        </div>
      </div>
    </footer>
  );
}
