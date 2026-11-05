// @vitest-environment jsdom
import { act } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import PostEditor from "@/app/_components/PostEditor";
import { savePost } from "@/lib/actions/posts";
import { enableAdminMode } from "@/lib/adminMode";

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/lib/actions/posts", () => ({
  savePost: vi.fn(),
  deletePost: vi.fn(),
}));

vi.mock("@/lib/adminMode", () => ({
  enableAdminMode: vi.fn(),
}));

const DRAFT_NOTICE = "임시저장된 글이 있습니다";

// jsdom은 <dialog>의 showModal·close를 구현하지 않는다. 브라우저처럼 open 속성을 바꾸고 close 이벤트를 보낸다.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

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

describe("글 설정 패널", () => {
  it("발행 버튼으로 열고, 닫기로 닫는다", () => {
    render(<PostEditor type="diary" />);
    const dialog = screen.getByRole("dialog", { hidden: true }) as HTMLDialogElement;
    expect(dialog.open).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "발행" }));
    expect(dialog.open).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(dialog.open).toBe(false);
  });

  it("ESC로 브라우저가 닫아도 다시 열 수 있다", () => {
    render(<PostEditor type="diary" />);
    const dialog = screen.getByRole("dialog", { hidden: true }) as HTMLDialogElement;
    fireEvent.click(screen.getByRole("button", { name: "발행" }));

    act(() => dialog.close());
    fireEvent.click(screen.getByRole("button", { name: "발행" }));

    expect(dialog.open).toBe(true);
  });

  it("바깥(배경)을 누르면 닫고, 패널 안을 누르면 닫지 않는다", () => {
    render(<PostEditor type="diary" />);
    const dialog = screen.getByRole("dialog", { hidden: true }) as HTMLDialogElement;
    fireEvent.click(screen.getByRole("button", { name: "발행" }));

    fireEvent.click(screen.getByText("글 설정"));
    expect(dialog.open).toBe(true);

    fireEvent.click(dialog);
    expect(dialog.open).toBe(false);
  });
});

describe("글 설정 패널 접근성", () => {
  it("공개 범위 버튼이 이름과 눌림 상태를 알린다", () => {
    render(<PostEditor type="diary" defaultVisibility="private" />);
    fireEvent.click(screen.getByRole("button", { name: "발행" }));

    expect(screen.getByRole("button", { name: "비공개" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "공개" }));

    expect(screen.getByRole("button", { name: "공개" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "비공개" })).toHaveAttribute("aria-pressed", "false");
  });

  it("카테고리 선택이 라벨과 연결된다", () => {
    render(<PostEditor type="blog" categories={["개발"]} />);
    fireEvent.click(screen.getByRole("button", { name: "발행" }));

    expect(screen.getByLabelText("카테고리")).toHaveProperty("tagName", "SELECT");
  });
});

describe("글 에디터 카테고리", () => {
  it("서버에서 받은 카테고리를 처음부터 보이고, 지워진 글의 카테고리는 삭제됨으로 표시한다", () => {
    render(
      <PostEditor
        type="blog"
        categories={["개발"]}
        initial={{ id: "1", slug: "a", title: "t", content: "c", visibility: "public", categorySlug: "옛카테고리" }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "발행" }));

    const select = screen.getByRole("option", { name: "카테고리 선택" }).closest("select");
    const options = Array.from(select?.options ?? []).map((option) => option.textContent);
    expect(options).toEqual(["카테고리 선택", "옛카테고리 (삭제됨)", "개발"]);
  });
});

describe("글 에디터 발행", () => {
  const INITIAL = {
    id: "post-1",
    slug: "post-1",
    title: "제목",
    content: "본문",
    visibility: "private" as const,
  };

  function openPanelAndGetPublishButton() {
    render(<PostEditor type="diary" initial={INITIAL} />);
    fireEvent.click(screen.getByRole("button", { name: "발행" }));
    return screen.getByRole("button", { name: "발행하기" }) as HTMLButtonElement;
  }

  afterEach(() => {
    vi.mocked(savePost).mockReset();
  });

  it("저장을 기다리는 동안 발행 버튼을 막아 두 번 눌러도 한 번만 저장한다", async () => {
    const save = Promise.withResolvers<Awaited<ReturnType<typeof savePost>>>();
    vi.mocked(savePost).mockReturnValue(save.promise);
    const publish = openPanelAndGetPublishButton();

    fireEvent.click(publish);
    await act(async () => {});
    fireEvent.click(publish);

    expect(savePost).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "발행 중..." })).toHaveProperty("disabled", true);

    // React는 진행 중인 비동기 transition을 전역으로 묶어, 끝내지 않으면 다음 테스트의 isPending도 풀리지 않는다.
    await act(async () => save.resolve({ success: false, error: "끝" }));
  });

  it("저장에 성공하면 관리자 화면을 따로 켜지 않고 상세를 한 번만 받는다", async () => {
    vi.mocked(savePost).mockResolvedValue({
      success: true,
      data: { slug: "post-abc", type: "diary" },
    });
    vi.mocked(enableAdminMode).mockClear();
    router.push.mockClear();
    router.refresh.mockClear();
    const publish = openPanelAndGetPublishButton();

    await act(async () => {
      fireEvent.click(publish);
    });

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/diary/post-abc"));
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.refresh).not.toHaveBeenCalled();
    expect(enableAdminMode).not.toHaveBeenCalled();
  });

  it("저장이 실패하면 이유를 보이고 다시 누를 수 있다", async () => {
    vi.mocked(savePost).mockResolvedValue({ success: false, error: "저장 실패 이유" });
    const publish = openPanelAndGetPublishButton();

    await act(async () => {
      fireEvent.click(publish);
    });

    expect(screen.getByText("저장 실패 이유")).toBeTruthy();
    await waitFor(() => expect(publish.disabled).toBe(false));
  });

  it("저장 요청이 끊겨도 화면이 깨지지 않고 오류를 보인다", async () => {
    vi.mocked(savePost).mockRejectedValue(new Error("network"));
    const publish = openPanelAndGetPublishButton();

    await act(async () => {
      fireEvent.click(publish);
    });

    expect(screen.getByText("글 저장에 실패했어요.")).toBeTruthy();
    await waitFor(() => expect(publish.disabled).toBe(false));
  });
});
