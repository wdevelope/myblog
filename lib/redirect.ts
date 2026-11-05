// 출처 비교용 가짜 기준 주소. 실제 사이트 주소와 상관없이 "같은 출처 경로인가"만 본다.
const BASE = "http://localhost";

// 로그인 from·콜백 next처럼 사용자가 넣을 수 있는 값으로 이동할 때 외부 사이트로 빠지지 않게 한다.
// `//x`, `/\x`, 탭이 섞인 `/\t/x`는 브라우저가 프로토콜 상대 주소로 해석하므로 URL 파서로 출처를 확인한다.
export function safeRedirectPath(value: string | null | undefined): string {
  if (!value?.startsWith("/")) return "/";
  try {
    const url = new URL(value, BASE);
    // `/.//x`처럼 점 조각이 정리되면 `//x`가 남고, 이 경로로 이동하면 다시 프로토콜 상대 주소가 된다.
    if (url.origin !== BASE || url.pathname.startsWith("//")) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
