// 관리자 화면(draft mode)은 관리자 세션이 있는 동안 늘 켜 둔다. 로그인할 때 켜고, 그 밖에는 헤더의
// AdminModeSync가 맞춘다. 켜 두면 공개 페이지가 CDN 캐시를 건너뛰고 요청마다 렌더링된다. draft 쿠키는
// 브라우저 세션 쿠키라, 로그인이 남은 채 브라우저를 다시 열면 꺼져 있다. 상태의 원본은 서버의 draft
// 쿠키(httpOnly)이고, 헤더가 그 값을 읽어 AdminModeSync에 넘긴다. 관리자가 아니면 서버가 켜기를 401로 거절한다.
export async function enableAdminMode(): Promise<boolean> {
  const response = await fetch("/api/admin-mode", { method: "POST" }).catch(() => null);
  return response?.status === 204;
}

export async function disableAdminMode(): Promise<boolean> {
  const response = await fetch("/api/admin-mode", { method: "DELETE" }).catch(() => null);
  return response?.status === 204;
}
