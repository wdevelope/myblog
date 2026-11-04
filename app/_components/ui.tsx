import Link from "next/link";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface shadow-sm shadow-black/5",
        "dark:shadow-black/20",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardBody({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("p-6", className)}>{children}</div>;
}

export function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "primary" | "success" | "warning";
}) {
  const base =
    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold";
  const styles: Record<typeof variant, string> = {
    default: "border-border bg-surface-2 text-muted",
    primary: "border-primary/30 bg-primary/15 text-primary",
    success: "border-emerald-500/25 bg-emerald-500/15 text-emerald-400",
    warning: "border-amber-500/25 bg-amber-500/15 text-amber-400",
  };
  return <span className={cn(base, styles[variant])}>{children}</span>;
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const base =
    "inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-bold transition";
  const styles =
    variant === "primary"
      ? "bg-primary text-white shadow-lg shadow-primary/20 hover:brightness-110"
      : "border border-border bg-surface text-foreground hover:bg-surface-2";

  return (
    <Link href={href} className={cn(base, styles)}>
      {children}
    </Link>
  );
}


export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-surface-2", className)}
    />
  );
}
