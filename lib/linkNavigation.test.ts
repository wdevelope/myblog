import { describe, expect, it } from "vitest";
import { isNavigationClick } from "@/lib/linkNavigation";

const current = "https://example.com/article?page=1";
const leftClick = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };

function anchor(href: string, attrs: { target?: string; download?: boolean } = {}) {
  return {
    href,
    target: attrs.target ?? "",
    hasAttribute: (name: string) => name === "download" && Boolean(attrs.download),
  };
}

describe("이동 표시를 띄울 링크 클릭 판정", () => {
  it("같은 출처의 다른 경로를 왼쪽 클릭하면 true다", () => {
    expect(isNavigationClick(leftClick, anchor("https://example.com/article/post-1"), current)).toBe(true);
    expect(isNavigationClick(leftClick, anchor("/feed"), current)).toBe(true);
  });

  it("수정키 클릭과 가운데 클릭은 새 탭으로 열리므로 false다", () => {
    for (const key of ["metaKey", "ctrlKey", "shiftKey", "altKey"] as const) {
      expect(isNavigationClick({ ...leftClick, [key]: true }, anchor("/feed"), current)).toBe(false);
    }
    expect(isNavigationClick({ ...leftClick, button: 1 }, anchor("/feed"), current)).toBe(false);
  });

  it("_blank 링크와 download 링크는 false다", () => {
    expect(isNavigationClick(leftClick, anchor("/feed", { target: "_blank" }), current)).toBe(false);
    expect(isNavigationClick(leftClick, anchor("/feed", { target: "_self" }), current)).toBe(true);
    expect(isNavigationClick(leftClick, anchor("/files/a.pdf", { download: true }), current)).toBe(false);
  });

  it("다른 출처는 false다", () => {
    expect(isNavigationClick(leftClick, anchor("https://other.example.com/feed"), current)).toBe(false);
  });

  it("해시만 다르면 false, 쿼리만 다르면 true다", () => {
    expect(isNavigationClick(leftClick, anchor("/article?page=1#comments"), current)).toBe(false);
    expect(isNavigationClick(leftClick, anchor("/article?page=2"), current)).toBe(true);
  });
});
