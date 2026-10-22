// Testing Library의 DOM 매처(toBeInTheDocument 등)를 expect에 붙인다.
import "@testing-library/jest-dom/vitest";

// jsdom은 Range의 배치 측정을 구현하지 않는다. CodeMirror가 스크롤 요청이 남은 작성 칸을 다음 애니메이션 프레임에
// 재며 이를 불러 Unhandled Error가 나므로, jsdom의 Element처럼 크기 0인 값을 돌려준다.
if (typeof Range !== "undefined") {
  Range.prototype.getClientRects ??= () => document.createElement("span").getClientRects();
  Range.prototype.getBoundingClientRect ??= () => document.createElement("span").getBoundingClientRect();
}
