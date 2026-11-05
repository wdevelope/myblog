// @vitest-environment jsdom
import { EditorSelection } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MarkdownEditor from "@/app/_components/MarkdownEditor";
import { coverSrcFromImageKey } from "@/lib/image";

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

// 입력기는 조합 중인 글자를 ㅎ → 하 → 한처럼 같은 자리에서 계속 바꿔 쓴다.
function compose(start: number, steps: string[]) {
  let length = 0;
  for (const step of steps) {
    view().dispatch({
      changes: { from: start, to: start + length, insert: step },
      selection: { anchor: start + step.length },
      userEvent: "input.type.compose",
    });
    length = step.length;
  }
}

describe("마크다운 에디터", () => {
  it("툴바 버튼은 선택한 글자를 문법으로 감싸고 바깥 값에도 알린다", () => {
    render(<Harness initial="안녕 세상" />);
    select(3, 5);
    fireEvent.click(screen.getByRole("button", { name: "굵게 (⌘B)" }));
    expect(text()).toBe("안녕 **세상**");
    expect(screen.getByLabelText("값").textContent).toBe("안녕 **세상**");
  });

  it("툴바로 서식을 넣고 다음 화면 프레임이 지나도 오류가 없다", async () => {
    render(<Harness initial="안녕" />);
    select(0, 2);
    fireEvent.click(screen.getByRole("button", { name: "굵게 (⌘B)" }));
    // 툴바 동작은 스크롤을 요청하므로, 다음 프레임에 CodeMirror가 작성 칸의 글자 크기를 Range로 잰다.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(text()).toBe("**안녕**");
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

  it("입력이 바깥 값으로 돌아오기 전에 다음 입력이 들어와도 글을 덮어쓰지 않는다", () => {
    const onChange = vi.fn();
    const upload = async () => [];
    const { rerender } = render(<MarkdownEditor value="" onChange={onChange} onUploadImages={upload} />);
    view().dispatch({ changes: { from: 0, insert: "가" }, selection: { anchor: 1 }, userEvent: "input.type" });
    view().dispatch({ changes: { from: 1, insert: "나" }, selection: { anchor: 2 }, userEvent: "input.type" });

    rerender(<MarkdownEditor value="가" onChange={onChange} onUploadImages={upload} />);

    expect(text()).toBe("가나");
    expect(view().state.selection.main.head).toBe(2);
  });

  it("보낸 값이 돌아온 뒤에 바깥에서 예전 글로 바꾸면 작성 칸도 바뀐다", async () => {
    render(<Harness initial="불러온 글" />);
    view().dispatch({ changes: { from: 5, insert: "!" }, userEvent: "input.type" });
    await waitFor(() => expect(screen.getByLabelText("값").textContent).toBe("불러온 글!"));

    fireEvent.click(screen.getByRole("button", { name: "임시저장 불러오기" }));

    expect(text()).toBe("불러온 글");
  });

  it("줄 끝 서식 뒤에서 Enter를 눌러도 서식이 갈라지지 않는다", () => {
    render(<Harness initial="끝 **굵게**" />);
    select(6);
    fireEvent.keyDown(content(), { key: "Enter", code: "Enter", keyCode: 13 });
    expect(text()).toBe("끝 **굵게**\n");
  });

  it("서식 바로 뒤에서 지우기 키를 누르면 보이는 글자를 지운다", () => {
    render(<Harness initial="**굵게** 뒤" />);
    select(6);
    fireEvent.keyDown(content(), { key: "Backspace", code: "Backspace", keyCode: 8 });
    expect(text()).toBe("**굵** 뒤");
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

  it("끌어다 놓은 이미지도 버킷 키로 들어간다", async () => {
    const key = "post-images-public:2026-10-22/a.png";
    const upload = vi.fn(async () => [key]);
    render(<Harness initial="앞 " upload={upload} />);
    select(2);
    const file = new File(["x"], "a.png", { type: "image/png" });
    fireEvent.drop(content(), { dataTransfer: { files: [file] } });

    await waitFor(() => expect(text()).toBe(`앞 ![](${key})`));
    expect(upload).toHaveBeenCalledWith([file]);
  });

  it("서식 안에서 한글을 조합해도 글자가 쪼개지지 않고 커서가 글자 뒤에 남는다", async () => {
    render(<Harness initial="**굵게**" />);
    select(3);

    compose(3, ["ㅎ", "하", "한"]);

    expect(text()).toBe("**굵한게**");
    expect(view().state.selection.main.head).toBe(4);
    await waitFor(() => expect(screen.getByLabelText("값").textContent).toBe("**굵한게**"));
  });

  it("숨긴 서식 기호 바로 뒤에서 조합한 한글은 서식 밖에 남는다", () => {
    render(<Harness initial="**굵게**" />);
    select(6);

    compose(6, ["ㅎ", "하", "한"]);

    expect(text()).toBe("**굵게**한");
    expect(view().state.selection.main.head).toBe(7);
  });

  it("업로드가 끝나면 커서를 넣은 이미지 문법 뒤에 둔다", async () => {
    const key = "post-images-public:2026-10-22/a.png";
    render(<Harness initial="앞 뒤" upload={async () => [key]} />);
    select(2);
    const file = new File(["x"], "a.png", { type: "image/png" });
    fireEvent.paste(content(), { clipboardData: { files: [file] } });

    await waitFor(() => expect(text()).toBe(`앞 ![](${key})뒤`));
    expect(view().state.selection.main.head).toBe(`앞 ![](${key})`.length);
  });

  it("커서가 있는 줄의 이미지도 경로 없이 이미지로만 보인다", () => {
    const key = "post-images-private:2026-10-22/a.png";
    render(<Harness initial={`> 입니다.![](${key})`} />);
    select(text().length);
    const image = content().querySelector("img.cm-md-image");
    expect(image?.getAttribute("src")).toBe(coverSrcFromImageKey(key));
    expect(content().textContent).not.toContain(key);
  });

  it("이미지를 누르면 이미지 전체를 선택해 지우기 키로 지울 수 있다", () => {
    render(<Harness initial={"앞\n\n![](post-images-public:2026-10-22/a.png)\n\n뒤"} />);
    select(0);
    const image = content().querySelector("img.cm-md-image");
    if (!image) throw new Error("이미지가 없다");
    fireEvent.mouseDown(image);
    const { from, to } = view().state.selection.main;
    expect(text().slice(from, to)).toBe("![](post-images-public:2026-10-22/a.png)");
    fireEvent.keyDown(content(), { key: "Backspace", code: "Backspace", keyCode: 8 });
    expect(text()).toBe("앞\n\n\n\n뒤");
  });

  it("선택한 이미지의 정렬 버튼은 주소 끝 조각만 바꾸고 되돌리기 한 번에 돌아간다", () => {
    const key = "post-images-public:2026-10-22/a.png";
    render(<Harness initial={`앞\n\n![](${key})`} />);
    fireEvent.mouseDown(content().querySelector("img.cm-md-image")!);
    fireEvent.click(screen.getByRole("button", { name: "가운데 정렬" }));
    expect(text()).toBe(`앞\n\n![](${key}#align=center)`);
    expect(screen.getByRole("button", { name: "가운데 정렬" }).getAttribute("aria-pressed")).toBe("true");
    const { from, to } = view().state.selection.main;
    expect(text().slice(from, to)).toBe(`![](${key}#align=center)`);

    fireEvent.keyDown(content(), { key: "z", code: "KeyZ", keyCode: 90, ctrlKey: true });
    expect(text()).toBe(`앞\n\n![](${key})`);
  });

  it("정렬을 바꿔도 이미 정한 폭은 그대로 둔다", () => {
    const key = "post-images-public:2026-10-22/a.png";
    render(<Harness initial={`![](${key}#w=60)`} />);
    const frame = content().querySelector<HTMLElement>(".cm-md-image-frame")!;
    expect(frame.style.width).toBe("60%");
    fireEvent.mouseDown(frame.querySelector("img")!);
    fireEvent.click(screen.getByRole("button", { name: "오른쪽 정렬" }));
    expect(text()).toBe(`![](${key}#w=60&align=right)`);
  });

  it("툴바의 삭제 버튼은 이미지를 지운다", () => {
    render(<Harness initial={"앞\n\n![](post-images-public:2026-10-22/a.png)\n\n뒤"} />);
    fireEvent.mouseDown(content().querySelector("img.cm-md-image")!);
    fireEvent.click(screen.getByRole("button", { name: "이미지 삭제" }));
    expect(text()).toBe("앞\n\n\n\n뒤");
  });

  it("이미지 바로 뒤에서 지우면 이미지 문법 전체를 한 번에 지운다", () => {
    render(<Harness initial="앞 ![](post-images-public:2026-10-22/a.png)" />);
    select(text().length);
    fireEvent.keyDown(content(), { key: "Backspace", code: "Backspace", keyCode: 8 });
    expect(text()).toBe("앞 ");
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

  it("커서가 밖에 있는 표는 글 화면과 같은 표로 그리고, 본문의 HTML은 글자로 둔다", () => {
    render(<Harness initial={"앞\n\n| 이름 |\n| --- |\n| <b>값</b> |"} />);
    expect(content().querySelector("table td")?.textContent).toBe("<b>값</b>");
    expect(content().querySelector("td b")).toBeNull();

    select(text().length);
    expect(content().querySelector("table")).toBeNull();
  });

  it("제목은 한 줄이라 Enter를 막고 붙여넣은 줄바꿈은 공백으로 바꾼다", () => {
    const onTitleChange = vi.fn();
    render(
      <MarkdownEditor value="" onChange={vi.fn()} onUploadImages={async () => []} title="" onTitleChange={onTitleChange} />
    );
    const title = screen.getByPlaceholderText("제목을 입력하세요.");

    expect(fireEvent.keyDown(title, { key: "Enter" })).toBe(false);
    fireEvent.change(title, { target: { value: "첫째 줄\n  둘째 줄" } });
    expect(onTitleChange).toHaveBeenCalledWith("첫째 줄 둘째 줄");
  });

  it("미리보기 패널 없이 작성 칸 하나만 그린다", () => {
    render(<Harness initial="**굵게**" />);
    expect(screen.queryByRole("button", { name: "미리보기" })).toBeNull();
    expect(document.querySelector(".markdown-body")).toBeNull();
  });
});
