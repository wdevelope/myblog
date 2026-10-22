// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ArticleListBackButton, RememberArticleList } from "@/app/article/ArticleListMemory";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

beforeEach(() => {
  sessionStorage.clear();
  push.mockClear();
});

// vitest globals가 꺼져 있어 Testing Library가 자동으로 정리하지 않는다.
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function clickBack() {
  render(<ArticleListBackButton>← 목록으로</ArticleListBackButton>);
  fireEvent.click(screen.getByRole("button", { name: "← 목록으로" }));
}

describe("아티클 목록으로 돌아가기", () => {
  it("마지막으로 본 카테고리 목록의 쪽으로 돌아간다", () => {
    const list = render(<RememberArticleList href="/article/category/dev/page/2" />);
    list.unmount();

    clickBack();

    expect(push).toHaveBeenCalledExactlyOnceWith("/article/category/dev/page/2");
  });

  it("같은 목록 화면에서 카테고리를 바꾸면 바꾼 목록을 기억한다", () => {
    const list = render(<RememberArticleList href="/article/category/dev" />);
    list.rerender(<RememberArticleList href="/article" />);
    list.unmount();

    clickBack();

    expect(push).toHaveBeenCalledExactlyOnceWith("/article");
  });

  it("목록을 거치지 않고 들어왔으면 전체 목록으로 돌아간다", () => {
    clickBack();

    expect(push).toHaveBeenCalledExactlyOnceWith("/article");
  });

  it("sessionStorage가 throw해도 깨지지 않고 전체 목록으로 돌아간다", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });

    render(<RememberArticleList href="/article/category/dev" />);
    clickBack();

    expect(push).toHaveBeenCalledExactlyOnceWith("/article");
  });
});
