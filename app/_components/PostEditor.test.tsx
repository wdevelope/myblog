// @vitest-environment jsdom
import { act } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import PostEditor from "@/app/_components/PostEditor";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/lib/actions/categories", () => ({
  getCategories: async () => ({ success: true, categories: [] }),
}));

vi.mock("@/lib/actions/posts", () => ({
  createPost: vi.fn(),
  deletePost: vi.fn(),
}));

vi.mock("@/lib/adminMode", () => ({
  enableAdminMode: vi.fn(),
}));

const DRAFT_NOTICE = "임시저장된 글이 있습니다";

function saveDraft(key: string, overrides: Record<string, unknown> = {}) {
  localStorage.setItem(
    key,
    JSON.stringify({
      version: 1,
      type: "blog",
      title: "임시 제목",
      content: "임시 본문",
      visibility: "public",
      categorySlug: "",
      imageKeys: [],
      thumbnailImageKey: "",
      updatedAt: "2026-10-22T00:00:00.000Z",
      ...overrides,
    }),
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.body.innerHTML = "";
});

describe("글 에디터 임시저장 알림", () => {
  it("지금 내용과 다른 임시저장 글이 있으면 알림을 띄우고, 불러오면 내용을 채운다", () => {
    saveDraft("draft:post:new:blog");
    render(<PostEditor type="blog" />);

    expect(screen.getByText(DRAFT_NOTICE)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "불러오기" }));

    expect((screen.getByPlaceholderText("제목을 입력하세요.") as HTMLInputElement).value).toBe("임시 제목");
    expect(screen.queryByText(DRAFT_NOTICE)).toBeNull();
  });

  it("임시저장 글이 지금 내용과 같으면 알림을 띄우지 않는다", () => {
    saveDraft("draft:post:edit:p1", { title: "제목", content: "본문", categorySlug: "개발" });
    render(
      <PostEditor
        type="blog"
        initial={{ id: "p1", slug: "post-1", title: "제목", content: "본문", visibility: "public", categorySlug: "개발" }}
      />,
    );

    expect(screen.queryByText(DRAFT_NOTICE)).toBeNull();
  });

  it("서버 HTML에는 알림이 없어 hydration이 어긋나지 않고, hydration 뒤에 알림을 띄운다", async () => {
    saveDraft("draft:post:new:blog");
    const html = renderToString(<PostEditor type="blog" />);
    expect(html).not.toContain(DRAFT_NOTICE);

    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.append(container);
    const recoverableErrors: unknown[] = [];

    await act(async () => {
      hydrateRoot(container, <PostEditor type="blog" />, {
        onRecoverableError: (error) => recoverableErrors.push(error),
      });
    });

    expect(recoverableErrors).toEqual([]);
    expect(screen.getByText(DRAFT_NOTICE)).toBeTruthy();
  });
});

describe("글 에디터 기본 제목", () => {
  const DATE_TITLE = "2026년 11월 4일의 기록";
  const DIARY_DRAFT_KEY = "draft:post:new:diary";

  function titleInput() {
    return screen.getByPlaceholderText("제목을 입력하세요.") as HTMLInputElement;
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it("기본 제목을 제목 칸에 채운다", () => {
    render(<PostEditor type="diary" defaultTitle={DATE_TITLE} />);

    expect(titleInput().value).toBe(DATE_TITLE);
  });

  it("기본 제목만 있으면 쓴 내용이 없으므로 임시저장하지 않는다", () => {
    vi.useFakeTimers();
    render(<PostEditor type="diary" defaultTitle={DATE_TITLE} />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(localStorage.getItem(DIARY_DRAFT_KEY)).toBeNull();
  });

  it("기본 제목을 고치면 임시저장한다", () => {
    vi.useFakeTimers();
    render(<PostEditor type="diary" defaultTitle={DATE_TITLE} />);

    fireEvent.change(titleInput(), { target: { value: "봄날" } });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(JSON.parse(localStorage.getItem(DIARY_DRAFT_KEY) ?? "{}").title).toBe("봄날");
  });
});
