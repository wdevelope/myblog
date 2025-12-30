"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/app/_components/ToastProvider";

export default function LogoutButton({
  className,
  children = "로그아웃",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();

  async function onLogout() {
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      await fetch("/logout", { redirect: "manual" }).catch(() => null);
    } finally {
      toast({ message: "로그아웃 완료", variant: "success" });
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <button type="button" onClick={() => void onLogout()} className={className}>
      {children}
    </button>
  );
}
