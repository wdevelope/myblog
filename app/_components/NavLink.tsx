"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Using startsWith logic for subpages but exact match logic requires careful handling.
  // Generally for top nav, if current path starts with the link href, it's active.
  // Exception: if href is "/" it matches everything.
  // Here our links are /feed, /article, /diary.
  const isActive = href === "/" ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`text-sm transition-colors ${
        isActive
          ? "font-bold text-foreground"
          : "font-medium text-muted hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
