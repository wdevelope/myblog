"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavActive } from "@/lib/constants";

export default function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = isNavActive(pathname, href);

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
