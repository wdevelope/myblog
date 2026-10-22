type ClickLike = Pick<MouseEvent, "button" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey">;
type AnchorLike = { href: string; target: string; hasAttribute(name: string): boolean };

// 같은 탭에서 다른 화면으로 가는 링크 클릭만 고른다. 새 탭·다운로드·외부 주소·같은 화면 안의 해시 이동은
// 서버 응답을 기다리지 않으므로 이동 표시를 띄우지 않는다.
export function isNavigationClick(event: ClickLike, anchor: AnchorLike, currentHref: string): boolean {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;

  const current = new URL(currentHref);
  const next = new URL(anchor.href, current);
  if (next.origin !== current.origin) return false;
  return next.pathname !== current.pathname || next.search !== current.search;
}
