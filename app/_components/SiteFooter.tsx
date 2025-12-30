export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-center gap-4 px-4 py-10 text-sm text-muted sm:justify-between sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} 인생일지</p>
      </div>
    </footer>
  );
}
