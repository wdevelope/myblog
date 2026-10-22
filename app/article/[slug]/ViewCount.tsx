"use client";

import { useEffect, useState } from "react";

const COUNTED_KEY_PREFIX = "view-counted:";

// 사생활 보호 모드·저장소 차단에서는 sessionStorage 접근이 throw한다. 그때는 탭 안 중복 확인만 포기한다.
function wasCounted(key: string) {
  try {
    return sessionStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

function markCounted(key: string) {
  try {
    sessionStorage.setItem(key, "1");
  } catch {}
}

// 상세 페이지는 정적·ISR이라 첫 HTML에는 생성 당시 수가 있다. 마운트 뒤 서버가 센 수로 바꾼다.
export default function ViewCount({ slug, initialCount }: { slug: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    // 같은 탭에서 새로고침·뒤로 가기로 다시 열어도 한 번만 센다.
    const key = `${COUNTED_KEY_PREFIX}${slug}`;
    if (wasCounted(key)) return;
    // 응답 전에 표시해 Strict Mode의 두 번째 effect가 다시 보내지 않게 한다.
    markCounted(key);

    fetch("/api/views", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug }),
    })
      .then(async (response) => {
        // 204(관리자 화면·봇)와 실패는 생성 당시 수를 그대로 둔다.
        if (response.status !== 200) return;
        const { viewCount } = (await response.json()) as { viewCount?: unknown };
        if (typeof viewCount === "number") setCount(viewCount);
      })
      .catch(() => {});
  }, [slug]);

  return <>조회수 {count.toLocaleString("ko-KR")}회</>;
}
