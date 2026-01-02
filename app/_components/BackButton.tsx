"use client";

import { useRouter } from "next/navigation";

export default function BackButton({
  fallbackHref = "/",
  mode = "back",
  className,
  children = "뒤로",
}: {
  fallbackHref?: string;
  mode?: "back" | "href";
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (mode === "href") {
          router.push(fallbackHref);
          return;
        }

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
