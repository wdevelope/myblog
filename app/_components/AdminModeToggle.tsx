"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { disableAdminMode, enableAdminMode } from "@/lib/adminMode";
import { useSessionUser } from "@/app/_components/useSessionUser";

// enabled는 헤더가 읽은 서버의 draft mode 값이다. 쿠키가 httpOnly라 브라우저가 직접 읽지 못한다.
export default function AdminModeToggle({
  enabled,
  className = "",
}: {
  enabled: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { user, loading } = useSessionUser();
  const [pending, startTransition] = useTransition();
  // 표시용이다. 켜기 요청은 서버가 assertAdmin으로 다시 판정한다.
  const isAdmin = user?.app_metadata?.is_admin === true;

  // 세션이 만료되거나 다른 탭에서 로그아웃하면 draft 쿠키만 남는다. 그대로 두면 정적 화면을 계속 동적으로 렌더링한다.
  useEffect(() => {
    if (loading || !enabled || isAdmin) return;
    void disableAdminMode().then((ok) => {
      if (ok) router.refresh();
    });
  }, [loading, enabled, isAdmin, router]);

  if (loading || !isAdmin) return null;

  function toggle() {
    startTransition(async () => {
      const ok = enabled ? await disableAdminMode() : await enableAdminMode();
      if (!ok) {
        toast.error(enabled ? "관리자 화면을 끄지 못했어요." : "관리자 화면을 켜지 못했어요. 다시 로그인해 주세요.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      aria-pressed={enabled}
      disabled={pending}
      onClick={toggle}
      className={[
        "items-center justify-center rounded-xl border text-sm font-semibold transition disabled:opacity-60",
        enabled
          ? "border-primary/50 bg-primary/12 text-primary hover:bg-primary/20"
          : "border-border bg-surface text-foreground hover:border-primary/40 hover:bg-surface-2",
        className,
      ].join(" ")}
    >
      관리자 화면
    </button>
  );
}
