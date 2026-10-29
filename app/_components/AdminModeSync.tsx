"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { disableAdminMode, enableAdminMode } from "@/lib/adminMode";
import { useSessionUser } from "@/app/_components/useSessionUser";

// enabled는 헤더가 읽은 서버의 draft mode 값이다. 쿠키가 httpOnly라 브라우저가 직접 읽지 못한다.
// 관리자 세션이 있으면 늘 켜 둔다. draft 쿠키는 브라우저 세션 쿠키라 로그인이 남은 채 브라우저를 다시 열면 꺼져 있다.
// 반대로 세션이 만료되거나 다른 탭에서 로그아웃하면 draft 쿠키만 남는다. 그대로 두면 정적 화면을 계속 동적으로 렌더링한다.
export default function AdminModeSync({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const { user, loading } = useSessionUser();
  // 표시용이다. 켜기 요청은 서버가 assertAdmin으로 다시 판정한다.
  const isAdmin = user?.app_metadata?.is_admin === true;

  useEffect(() => {
    if (loading || enabled === isAdmin) return;
    void (isAdmin ? enableAdminMode() : disableAdminMode()).then((ok) => {
      if (ok) router.refresh();
      else if (isAdmin) toast.error("관리자 화면을 켜지 못했어요. 다시 로그인해 주세요.");
    });
  }, [loading, enabled, isAdmin, router]);

  return null;
}
