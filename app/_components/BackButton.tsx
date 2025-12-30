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
        try {
          router.back();
        } catch {
          router.replace(fallbackHref);
        }
      }}
      className={className}
    >
      {children}
    </button>
  );
}

