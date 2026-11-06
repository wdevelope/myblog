// @vitest-environment jsdom
import { EditorView } from "@codemirror/view";
import { act } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { toast } from "sonner";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
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

vi.mock("sonner", () => ({ toast: { error: vi.fn(), promise: vi.fn() } }));

const DRAFT_NOTICE = "임시저장된 글이 있습니다";
const OUTDATED_NOTICE = /불러와서 발행하면 그 수정이 사라져요/;
const OPENED_AT = "2026-11-06T01:00:00.000000+00:00";

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
        initial={{ id: "p1", slug: "post-1", title: "제목", content: "본문", visibility: "public", categorySlug: "개발", updatedAt: OPENED_AT }}
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

  it("며칠 전 초안을 방금 쓴 것으로 착각하지 않게 저장한 날짜까지 보인다", () => {
    saveDraft("draft:post:new:blog", { updatedAt: "2026-10-22T00:00:00.000Z" });
    render(<PostEditor type="blog" />);

    expect(screen.getByText(/2026.*에\s*저장됨/)).toBeTruthy();
  });
});

describe("글 에디터 오래된 임시저장", () => {
  const EDIT_KEY = "draft:post:edit:p1";
  const INITIAL = { id: "p1", slug: "post-1", title: "제목", content: "서버 본문", visibility: "public" as const, categorySlug: "개발", updatedAt: OPENED_AT };
  const DRAFT = { title: "제목", content: "고치던 초안", categorySlug: "개발" };

  it("초안을 쓰던 때보다 글이 새로우면 불러오기 전에 그 수정이 사라진다고 알린다", () => {
    saveDraft(EDIT_KEY, { ...DRAFT, baseUpdatedAt: "2026-11-05T01:00:00.000000+00:00" });
    render(<PostEditor type="blog" initial={INITIAL} />);

    expect(screen.getByText(OUTDATED_NOTICE)).toBeTruthy();
  });

  it("수정일을 남기지 않던 때의 초안은 글이 바뀌었는지 알 수 없어 같이 알린다", () => {
    saveDraft(EDIT_KEY, DRAFT);
    render(<PostEditor type="blog" initial={INITIAL} />);

    expect(screen.getByText(OUTDATED_NOTICE)).toBeTruthy();
  });

  it("초안을 쓴 뒤 글이 그대로면 경고 없이 알린다", () => {
    saveDraft(EDIT_KEY, { ...DRAFT, baseUpdatedAt: OPENED_AT });
    render(<PostEditor type="blog" initial={INITIAL} />);

    expect(screen.getByText(DRAFT_NOTICE)).toBeTruthy();
    expect(screen.queryByText(OUTDATED_NOTICE)).toBeNull();
  });

  it("경고를 보고 불러오면 덮어쓰기로 알고 고른 것이라 지금 글의 수정일로 발행한다", async () => {
    vi.mocked(savePost).mockResolvedValue({ success: false, error: "저장 실패 이유" });
    saveDraft(EDIT_KEY, { ...DRAFT, baseUpdatedAt: "2026-11-05T01:00:00.000000+00:00" });
    render(<PostEditor type="blog" initial={INITIAL} />);

    fireEvent.click(screen.getByRole("button", { name: "불러오기" }));
    fireEvent.click(screen.getByRole("button", { name: "발행" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "발행하기" }));
    });

    expect(vi.mocked(savePost).mock.calls[0][0]).toMatchObject({ content: "고치던 초안", baseUpdatedAt: OPENED_AT });
    vi.mocked(savePost).mockReset();
  });

  it("새 글의 초안은 덮을 글이 없어 경고하지 않는다", () => {
    saveDraft("draft:post:new:blog");
    render(<PostEditor type="blog" />);

    expect(screen.queryByText(OUTDATED_NOTICE)).toBeNull();
  });
});

describe("글 에디터 임시저장 보존", () => {
  const EDIT_KEY = "draft:post:edit:p1";
  const NEW_DIARY_KEY = "draft:post:new:diary:2026-11-04";
  const INITIAL = { id: "p1", slug: "post-1", title: "제목", content: "서버 본문", visibility: "public" as const, categorySlug: "개발", updatedAt: OPENED_AT };
  const DRAFT = { title: "제목", content: "고치던 초안", categorySlug: "개발" };

  function waitForAutoSave() {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }

  function storedContent(key: string) {
    return JSON.parse(localStorage.getItem(key) ?? "{}").content;
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.mocked(savePost).mockReset();
  });

  it("수정 화면을 열어 두기만 해서는 임시저장 글을 덮어쓰지 않는다", () => {
    saveDraft(EDIT_KEY, DRAFT);
    render(<PostEditor type="blog" initial={INITIAL} />);

    waitForAutoSave();

    expect(storedContent(EDIT_KEY)).toBe("고치던 초안");
  });

  it("닫기를 눌러도 임시저장 글이 남아 다시 열면 알림이 뜬다", () => {
    saveDraft(EDIT_KEY, DRAFT);
    render(<PostEditor type="blog" initial={INITIAL} />);

    fireEvent.click(screen.getAllByRole("button", { name: "닫기" })[0]);
    waitForAutoSave();
    cleanup();
    render(<PostEditor type="blog" initial={INITIAL} />);

    expect(screen.getByText(DRAFT_NOTICE)).toBeTruthy();
  });

  it("상단 저장을 눌러도 바꾼 내용이 없으면 임시저장 글을 덮어쓰지 않는다", () => {
    saveDraft(EDIT_KEY, DRAFT);
    render(<PostEditor type="blog" initial={INITIAL} />);

    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(storedContent(EDIT_KEY)).toBe("고치던 초안");
  });

  it("수정 화면을 열기만 하면 본문 사본을 남기지 않는다", () => {
    render(<PostEditor type="blog" initial={INITIAL} />);

    waitForAutoSave();

    expect(localStorage.getItem(EDIT_KEY)).toBeNull();
  });

  it("수정 화면에서 글을 고치면 임시저장한다", () => {
    render(<PostEditor type="blog" initial={INITIAL} />);

    fireEvent.change(screen.getByPlaceholderText("제목을 입력하세요."), { target: { value: "새 제목" } });
    waitForAutoSave();

    expect(JSON.parse(localStorage.getItem(EDIT_KEY) ?? "{}").title).toBe("새 제목");
  });

  it("임시저장에 글을 연 때의 수정일을 남겨 나중에 글이 바뀌었는지 알 수 있다", () => {
    render(<PostEditor type="blog" initial={INITIAL} />);

    fireEvent.change(screen.getByPlaceholderText("제목을 입력하세요."), { target: { value: "고친 제목" } });
    waitForAutoSave();

    expect(JSON.parse(localStorage.getItem(EDIT_KEY) ?? "{}").baseUpdatedAt).toBe(OPENED_AT);
  });

  it("날짜를 고른 새 다이어리를 열기만 해서는 쓰던 일기를 빈 글로 덮어쓰지 않는다", () => {
    saveDraft(NEW_DIARY_KEY, { type: "diary", title: "봄날", content: "쓰던 일기", createdAtYmd: "2026-11-04" });
    render(<PostEditor type="diary" createdAtYmd="2026-11-04" draftDate="2026-11-04" />);

    waitForAutoSave();

    expect(storedContent(NEW_DIARY_KEY)).toBe("쓰던 일기");
  });

  it("날짜만 있고 쓴 내용이 없는 다이어리는 공개 범위를 바꿔도 임시저장하지 않는다", () => {
    render(<PostEditor type="diary" defaultVisibility="private" createdAtYmd="2026-11-04" draftDate="2026-11-04" />);

    fireEvent.click(screen.getByRole("button", { name: "발행" }));
    fireEvent.click(screen.getByRole("button", { name: "공개" }));
    waitForAutoSave();

    expect(localStorage.getItem(NEW_DIARY_KEY)).toBeNull();
  });

  it("발행이 끝나면 기다리던 자동 저장이 지운 임시저장 글을 되살리지 않는다", async () => {
    vi.mocked(savePost).mockResolvedValue({ success: true, data: { slug: "post-1", type: "blog" } });
    render(<PostEditor type="blog" initial={INITIAL} />);

    fireEvent.change(screen.getByPlaceholderText("제목을 입력하세요."), { target: { value: "새 제목" } });
    fireEvent.click(screen.getByRole("button", { name: "발행" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "발행하기" }));
    });
    waitForAutoSave();

    expect(localStorage.getItem(EDIT_KEY)).toBeNull();
  });
});

describe("다이어리 날짜별 임시저장", () => {
  const OLD_KEY = "draft:post:new:diary";
  const keyOf = (ymd: string) => `${OLD_KEY}:${ymd}`;

  function renderDiary(ymd: string, createdAtYmd: string | undefined = ymd) {
    return render(
      <PostEditor
        type="diary"
        defaultVisibility="private"
        defaultTitle={`${ymd}의 기록`}
        createdAtYmd={createdAtYmd}
        draftDate={ymd}
      />,
    );
  }

  function typeTitle(title: string) {
    fireEvent.change(screen.getByPlaceholderText("제목을 입력하세요."), { target: { value: title } });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }

  function storedTitle(key: string) {
    return JSON.parse(localStorage.getItem(key) ?? "{}").title;
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.mocked(savePost).mockReset();
  });

  it("다른 날짜 화면에는 그 날짜의 초안만 보여 날짜가 어긋난 글을 불러올 수 없다", () => {
    saveDraft(keyOf("2026-11-03"), { type: "diary", title: "11월 3일의 일기", content: "쓰던 일기" });

    renderDiary("2026-11-05");

    expect(screen.queryByText(DRAFT_NOTICE)).toBeNull();
  });

  it("날짜마다 칸이 따로라 다른 날짜에 써도 먼저 쓴 초안이 덮이지 않는다", () => {
    renderDiary("2026-11-03");
    typeTitle("봄날");
    cleanup();

    renderDiary("2026-11-05");
    typeTitle("여름날");

    expect(storedTitle(keyOf("2026-11-03"))).toBe("봄날");
    expect(storedTitle(keyOf("2026-11-05"))).toBe("여름날");
  });

  it("날짜를 고르지 않은 화면은 오늘 칸을 써서 어제 초안을 불러올 수 없다", () => {
    saveDraft(keyOf("2026-11-04"), { type: "diary", title: "어제의 일기", content: "쓰던 일기" });

    renderDiary("2026-11-05", undefined);

    expect(screen.queryByText(DRAFT_NOTICE)).toBeNull();
  });

  it("같은 날짜를 다시 열어 불러오면 제목과 날짜가 맞게 발행하고 그 날짜 칸을 비운다", async () => {
    vi.mocked(savePost).mockResolvedValue({ success: true, data: { slug: "post-1", type: "diary" } });
    saveDraft(keyOf("2026-11-03"), {
      type: "diary",
      title: "2026년 11월 3일의 기록",
      content: "쓰던 일기",
      visibility: "private",
      createdAtYmd: "2026-11-03",
    });
    renderDiary("2026-11-03");

    fireEvent.click(screen.getByRole("button", { name: "불러오기" }));
    fireEvent.click(screen.getByRole("button", { name: "발행" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "발행하기" }));
    });

    expect(savePost).toHaveBeenCalledWith(
      expect.objectContaining({ title: "2026년 11월 3일의 기록", createdAtYmd: "2026-11-03" }),
    );
    expect(localStorage.getItem(keyOf("2026-11-03"))).toBeNull();
  });

  it("날짜별 칸 이전의 초안은 그 초안의 날짜 칸으로 옮겨 알림으로 찾을 수 있다", () => {
    saveDraft(OLD_KEY, { type: "diary", title: "옛 일기", content: "쓰던 일기", createdAtYmd: "2026-11-03" });

    renderDiary("2026-11-03");

    expect(screen.getByText(DRAFT_NOTICE)).toBeTruthy();
    expect(localStorage.getItem(OLD_KEY)).toBeNull();
    expect(storedTitle(keyOf("2026-11-03"))).toBe("옛 일기");
  });

  it("날짜 없이 쓴 옛 초안은 마지막으로 저장한 한국 날짜의 칸으로 옮긴다", () => {
    saveDraft(OLD_KEY, { type: "diary", title: "옛 일기", content: "쓰던 일기", updatedAt: "2026-11-03T16:00:00.000Z" });

    renderDiary("2026-11-05");

    expect(screen.queryByText(DRAFT_NOTICE)).toBeNull();
    expect(storedTitle(keyOf("2026-11-04"))).toBe("옛 일기");
  });
});

describe("글 에디터 이미지 업로드", () => {
  const INITIAL = { id: "p1", slug: "post-1", title: "제목", content: "본문", visibility: "private" as const, updatedAt: OPENED_AT };
  const fetchMock = vi.fn<typeof fetch>();

  function image(name: string, bytes = 3) {
    return new File([new Uint8Array(bytes)], name, { type: "image/png" });
  }

  function uploaded(...keys: string[]) {
    return new Response(JSON.stringify({ keys }), { status: 200 });
  }

  function refused(error: string) {
    return new Response(JSON.stringify({ error }), { status: 400 });
  }

  function editorText() {
    const editor = screen.getByLabelText("본문").closest(".cm-editor") as HTMLElement;
    return EditorView.findFromDOM(editor)?.state.doc.toString();
  }

  async function pasteIntoBody(...files: File[]) {
    await act(async () => {
      fireEvent.paste(screen.getByLabelText("본문"), { clipboardData: { files } });
    });
  }

  async function chooseInPanel(input: Element, ...files: File[]) {
    await act(async () => {
      fireEvent.change(input, { target: { files } });
    });
  }

  function panelFileInputs() {
    fireEvent.click(screen.getByRole("button", { name: "발행" }));
    return Array.from(document.querySelectorAll('dialog input[type="file"]'));
  }

  function sentFileNames() {
    return fetchMock.mock.calls.map(([, init]) => (init?.body as FormData).getAll("files").map((file) => (file as File).name));
  }

  beforeEach(() => {
    fetchMock.mockReset();
    vi.mocked(toast.error).mockClear();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(savePost).mockReset();
  });

  it("여러 장을 넣으면 파일마다 따로 보내고 넣은 순서대로 본문에 붙인다", async () => {
    fetchMock.mockResolvedValueOnce(uploaded("post-images-private:a")).mockResolvedValueOnce(uploaded("post-images-private:b"));
    render(<PostEditor type="diary" defaultVisibility="private" />);

    await pasteIntoBody(image("a.png"), image("b.png"));

    expect(sentFileNames()).toEqual([["a.png"], ["b.png"]]);
    expect(editorText()).toBe("![](post-images-private:a)\n![](post-images-private:b)");
  });

  it("본문 업로드를 서버가 거절하면 이유를 토스트로 보이고 자리표시자를 지운다", async () => {
    fetchMock.mockResolvedValue(refused("SVG 이미지는 올릴 수 없어요."));
    render(<PostEditor type="diary" defaultVisibility="private" />);

    await pasteIntoBody(image("a.png"));

    expect(toast.error).toHaveBeenCalledWith("SVG 이미지는 올릴 수 없어요.");
    expect(editorText()).toBe("");
  });

  it("연결이 끊겨 본문 업로드가 실패해도 자리표시자를 남기지 않고 알린다", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<PostEditor type="diary" defaultVisibility="private" />);

    await pasteIntoBody(image("a.png"));

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(editorText()).toBe("");
  });

  it("4MB가 넘는 파일은 보내지 않고 이유를 알리며, 나머지 파일은 올린다", async () => {
    fetchMock.mockResolvedValue(uploaded("post-images-private:small"));
    render(<PostEditor type="diary" defaultVisibility="private" />);

    await pasteIntoBody(image("big.png", 4 * 1024 * 1024 + 1), image("small.png"));

    expect(sentFileNames()).toEqual([["small.png"]]);
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("big.png"));
    expect(editorText()).toBe("![](post-images-private:small)");
  });

  it("한 장이 거절돼도 다른 장은 올라간다", async () => {
    fetchMock.mockResolvedValueOnce(refused("거절")).mockResolvedValueOnce(uploaded("post-images-private:b"));
    render(<PostEditor type="diary" defaultVisibility="private" />);

    await pasteIntoBody(image("a.png"), image("b.png"));

    expect(toast.error).toHaveBeenCalledWith("거절");
    expect(editorText()).toBe("![](post-images-private:b)");
  });

  it("글 설정 창의 첨부 실패는 창 안에 보인다. 토스트는 열린 창 아래에 깔린다", async () => {
    fetchMock.mockResolvedValue(refused("첨부 거절"));
    render(<PostEditor type="diary" defaultVisibility="private" />);

    await chooseInPanel(panelFileInputs()[0], image("a.png"));

    expect(screen.getByRole("alert", { hidden: true }).textContent).toBe("첨부 거절");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("글 설정 창의 썸네일 실패도 창 안에 보인다", async () => {
    fetchMock.mockResolvedValue(refused("썸네일 거절"));
    render(<PostEditor type="blog" />);

    await chooseInPanel(panelFileInputs()[1], image("a.png"));

    expect(screen.getByRole("alert", { hidden: true }).textContent).toBe("썸네일 거절");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("이미지를 올리는 동안 발행하면 막아 자리표시자가 글에 저장되지 않고, 끝나면 발행할 수 있다", async () => {
    const upload = Promise.withResolvers<Response>();
    fetchMock.mockReturnValue(upload.promise);
    vi.mocked(savePost).mockResolvedValue({ success: true, data: { slug: "post-1", type: "diary" } });
    render(<PostEditor type="diary" initial={INITIAL} />);

    await pasteIntoBody(image("a.png"));
    fireEvent.click(screen.getByRole("button", { name: "발행" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "발행하기" }));
    });

    expect(savePost).not.toHaveBeenCalled();
    expect(screen.getByRole("alert", { hidden: true }).textContent).toContain("올리는 중");

    await act(async () => upload.resolve(uploaded("post-images-private:a")));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "발행하기" }));
    });

    expect(savePost).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining("![](post-images-private:a)") }));
  });
});

describe("글 에디터 기본 제목", () => {
  const DATE_TITLE = "2026년 11월 4일의 기록";
  const DIARY_DRAFT_KEY = "draft:post:new:diary:2026-11-04";

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
    render(<PostEditor type="diary" defaultTitle={DATE_TITLE} draftDate="2026-11-04" />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(localStorage.getItem(DIARY_DRAFT_KEY)).toBeNull();
  });

  it("기본 제목을 고치면 임시저장한다", () => {
    vi.useFakeTimers();
    render(<PostEditor type="diary" defaultTitle={DATE_TITLE} draftDate="2026-11-04" />);

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
        initial={{ id: "1", slug: "a", title: "t", content: "c", visibility: "public", categorySlug: "옛카테고리", updatedAt: OPENED_AT }}
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
    updatedAt: OPENED_AT,
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

  it("글을 연 때의 수정일을 같이 보내 서버가 그 뒤의 수정을 덮어쓰지 않게 한다", async () => {
    vi.mocked(savePost).mockResolvedValue({ success: false, error: "저장 실패 이유" });
    const publish = openPanelAndGetPublishButton();

    await act(async () => {
      fireEvent.click(publish);
    });

    expect(vi.mocked(savePost).mock.calls[0][0].baseUpdatedAt).toBe(OPENED_AT);
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
