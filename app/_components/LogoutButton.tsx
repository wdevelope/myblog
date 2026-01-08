"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function LogoutButton({
  className,
  children = "로그아웃",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();

  async function onLogout() {
    const promise = (async () => {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      await fetch("/logout", { redirect: "manual" }).catch(() => null);
      router.replace("/login");
      router.refresh();
      return "로그아웃 완료";
    })();

    toast.promise(promise, {
      loading: "로그아웃 중...",
      success: (data) => data,
      error: "로그아웃에 실패했어요.",
    });
  }

  return (
    <button type="button" onClick={() => void onLogout()} className={className}>
      {children}
    </button>
  );
}
