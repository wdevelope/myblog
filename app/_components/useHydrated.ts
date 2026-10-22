import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// 서버 렌더와 hydration 렌더에서는 false, 그 뒤로는 true다. localStorage처럼 브라우저에만 있는 값을
// 서버 HTML과 어긋나지 않게 hydration 뒤에 쓰려는 것으로, effect에서 setState로 "마운트됨"을 표시하면
// 렌더가 한 번 더 연쇄되므로 대신 쓴다.
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
