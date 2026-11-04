"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { isNavigationClick } from "@/lib/linkNavigation";

// 관리자 화면에서는 상세·목록이 요청마다 렌더링되는데, 여기에는 loading.tsx를 두지 않아 응답을 기다리는 동안
// 화면이 그대로다. 두면 방문자 정적 이동에도 스켈레톤이 뜨고, React가 스켈레톤을 최소 300ms 남겨 도착한 내용이
// 늦게 보인다(로드맵 23절). 그래서 링크 클릭부터 주소가 바뀔 때까지 맨 위에 얇은 막대를 띄운다.
// SiteHeader가 관리자 화면일 때만 그린다.
export default function AdminNavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // 주소가 바뀌면(이동이 끝나면) 다시 마운트돼 막대와 타이머가 함께 사라진다.
  return <ProgressBar key={`${pathname}?${searchParams.toString()}`} />;
}

function ProgressBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout> | undefined;
    let safetyTimer: ReturnType<typeof setTimeout> | undefined;

    function onClick(event: MouseEvent) {
      const anchor = event.target instanceof Element ? event.target.closest("a") : null;
      if (!anchor || !isNavigationClick(event, anchor, window.location.href)) return;
      clearTimeout(showTimer);
      clearTimeout(safetyTimer);
      // 캐시된 이동은 금방 끝나므로, 150ms 안에 끝나면 막대가 깜빡이지 않게 띄우지 않는다.
      showTimer = setTimeout(() => setVisible(true), 150);
      // 이동이 실패하거나 같은 주소로 끝나도 막대가 남지 않게 한다.
      safetyTimer = setTimeout(() => setVisible(false), 10_000);
    }

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimeout(showTimer);
      clearTimeout(safetyTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-label="화면 불러오는 중"
      className="pointer-events-none fixed inset-x-0 top-0 z-60 h-0.5 overflow-hidden bg-primary/20"
    >
      <div className="admin-nav-progress h-full w-1/3 bg-primary" />
    </div>
  );
}
