"use client";

import { Button, ButtonLink } from "@/app/_components/ui";

// 레이아웃 안에서 그려서 헤더가 남는다. 렌더 중 오류만 여기로 오고, 서버 액션 실패는 호출하는 곳에서 처리한다.
export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return (
    <section className="flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-xl font-bold text-foreground">화면을 불러오지 못했어요</h1>
      <p className="text-sm text-muted">잠시 뒤 다시 시도해 주세요.</p>
      <div className="flex gap-2">
        <Button onClick={retry}>다시 시도</Button>
        <ButtonLink href="/" variant="secondary">
          홈으로
        </ButtonLink>
      </div>
    </section>
  );
}
