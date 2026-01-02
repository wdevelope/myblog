"use client";

import { useRouter } from "next/navigation";

export default function BackButton({
  fallbackHref = "/",
  className,
  children = "뒤로",
}: {
  fallbackHref?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        router.push(fallbackHref);
      }}
      className={className}
    >
      {children}
    </button>
  );
}
