// 관리자 화면(draft mode)은 관리자가 헤더 토글로 직접 켜고 끈다. 켜 두면 공개 페이지가 CDN 캐시를 건너뛰고
// 요청마다 렌더링되므로 로그인만으로는 켜지 않는다. 상태의 원본은 서버의 draft 쿠키(httpOnly)이고,
// 헤더가 그 값을 읽어 토글에 넘긴다. 관리자가 아니면 서버가 켜기를 401로 거절한다.
export async function enableAdminMode(): Promise<boolean> {
  const response = await fetch("/api/admin-mode", { method: "POST" }).catch(() => null);
  return response?.status === 204;
}

export async function disableAdminMode(): Promise<boolean> {
  const response = await fetch("/api/admin-mode", { method: "DELETE" }).catch(() => null);
  return response?.status === 204;
}
