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
    success: "border-success/25 bg-success/15 text-success",
    warning: "border-warning/25 bg-warning/15 text-warning",
  };
  return <span className={cn(base, styles[variant])}>{children}</span>;
}

const BUTTON_VARIANTS = {
  primary: "bg-primary text-white shadow-lg shadow-primary/20 hover:brightness-110",
  secondary: "border border-border bg-surface text-foreground hover:bg-surface-2",
};

const BUTTON_SIZES = {
  xs: "h-8 px-4 text-xs",
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
  icon: "size-10",
};

type ButtonStyle = {
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: keyof typeof BUTTON_SIZES;
  className?: string;
};

// 링크·라벨처럼 버튼이 아닌 요소도 같은 모양을 쓰므로 클래스를 따로 내보낸다.
export function buttonClass({ variant = "primary", size = "md", className }: ButtonStyle = {}) {
  return cn(
    "inline-flex items-center justify-center rounded-xl font-bold transition disabled:opacity-50",
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonStyle & React.ComponentProps<"button">) {
  return <button type={type} className={buttonClass({ variant, size, className })} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ButtonStyle & React.ComponentProps<typeof Link>) {
  return <Link className={buttonClass({ variant, size, className })} {...props} />;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-surface-2", className)}
    />
  );
}
