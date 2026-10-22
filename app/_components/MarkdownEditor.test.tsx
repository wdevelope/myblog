// @vitest-environment jsdom
import { EditorSelection } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MarkdownEditor from "@/app/_components/MarkdownEditor";

afterEach(() => {
  cleanup();
});

function Harness({
  initial,
  upload = async () => [],
}: {
  initial: string;
  upload?: (files: File[]) => Promise<string[]>;
}) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <MarkdownEditor value={value} onChange={setValue} onUploadImages={upload} />
      <button type="button" onClick={() => setValue("불러온 글")}>
        임시저장 불러오기
      </button>
      <output aria-label="값">{value}</output>
    </>
  );
}

function content() {
  return screen.getByLabelText("본문");
}

function view() {
  const editor = content().closest(".cm-editor");
  const found = editor && EditorView.findFromDOM(editor as HTMLElement);
  if (!found) throw new Error("작성 칸이 없다");
  return found;
}

function text() {
  return view().state.doc.toString();
}

function select(start: number, end = start) {
  view().dispatch({ selection: EditorSelection.range(start, end) });
}

describe("마크다운 에디터", () => {
  it("툴바 버튼은 선택한 글자를 문법으로 감싸고 바깥 값에도 알린다", () => {
    render(<Harness initial="안녕 세상" />);
    select(3, 5);
    fireEvent.click(screen.getByRole("button", { name: "굵게 (⌘B)" }));
    expect(text()).toBe("안녕 **세상**");
    expect(screen.getByLabelText("값").textContent).toBe("안녕 **세상**");
  });

  it("툴바로 바꾼 글은 되돌리기 한 번에 원래대로 돌아간다", () => {
    render(<Harness initial="안녕" />);
    select(0, 2);
    fireEvent.click(screen.getByRole("button", { name: "굵게 (⌘B)" }));
    fireEvent.keyDown(content(), { key: "z", code: "KeyZ", keyCode: 90, ctrlKey: true });
    expect(text()).toBe("안녕");
  });

  it("굵게 단축키는 한글 자판이어도 자판 위치로 적용한다", () => {
    render(<Harness initial="안녕" />);
    select(0, 2);
    fireEvent.keyDown(content(), { key: "ㅠ", code: "KeyB", keyCode: 66, ctrlKey: true });
    expect(text()).toBe("**안녕**");
  });

  it("문단 스타일을 고르면 커서가 있는 줄을 제목으로 바꾼다", () => {
    render(<Harness initial="제목" />);
    select(1);
    fireEvent.change(screen.getByLabelText("문단 스타일"), { target: { value: "2" } });
    expect(text()).toBe("## 제목");
  });

  it("바깥에서 값이 바뀌면 작성 칸도 바뀐다", () => {
    render(<Harness initial="처음 글" />);
    fireEvent.click(screen.getByRole("button", { name: "임시저장 불러오기" }));
    expect(text()).toBe("불러온 글");
  });

  it("붙여넣은 이미지는 자리표시자를 거쳐 버킷 키로 들어간다", async () => {
    const upload = vi.fn(async () => ["post-images-public:2026-10-22/a.png"]);
    render(<Harness initial="앞 " upload={upload} />);
    select(2);
    const file = new File(["x"], "a.png", { type: "image/png" });
    fireEvent.paste(content(), { clipboardData: { files: [file] } });

    await waitFor(() => expect(text()).toBe("앞 ![](post-images-public:2026-10-22/a.png)"));
    expect(upload).toHaveBeenCalledWith([file]);
    expect(screen.getByLabelText("값").textContent).toBe("앞 ![](post-images-public:2026-10-22/a.png)");
  });

  it("업로드에 실패하면 자리표시자를 지운다", async () => {
    render(<Harness initial="앞 " upload={async () => []} />);
    select(2);
    const file = new File(["x"], "a.png", { type: "image/png" });
    fireEvent.paste(content(), { clipboardData: { files: [file] } });

    await waitFor(() => expect(text()).toBe("앞 "));
  });

  it("이미지가 아닌 붙여넣기는 올리지 않는다", () => {
    const upload = vi.fn(async () => []);
    render(<Harness initial="" upload={upload} />);
    fireEvent.paste(content(), { clipboardData: { files: [], getData: () => "" } });
    expect(upload).not.toHaveBeenCalled();
  });

  it("미리보기 패널 없이 작성 칸 하나만 그린다", () => {
    render(<Harness initial="**굵게**" />);
    expect(screen.queryByRole("button", { name: "미리보기" })).toBeNull();
    expect(document.querySelector(".markdown-body")).toBeNull();
  });
});
