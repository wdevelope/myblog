// @vitest-environment jsdom
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
  return <MarkdownEditor value={value} onChange={setValue} onUploadImages={upload} />;
}

function textarea() {
  return screen.getByLabelText("본문") as HTMLTextAreaElement;
}

function selectRange(start: number, end: number) {
  textarea().setSelectionRange(start, end);
}

describe("마크다운 에디터", () => {
  it("툴바 버튼은 선택한 글자를 문법으로 감싼다", () => {
    render(<Harness initial="안녕 세상" />);
    selectRange(3, 5);
    fireEvent.click(screen.getByRole("button", { name: "굵게 (⌘B)" }));
    expect(textarea().value).toBe("안녕 **세상**");
  });

  it("⌘B 단축키는 한글 입력 중이어도 자판 위치로 굵게를 적용한다", () => {
    render(<Harness initial="안녕" />);
    selectRange(0, 2);
    fireEvent.keyDown(textarea(), { key: "ㅠ", code: "KeyB", metaKey: true });
    expect(textarea().value).toBe("**안녕**");
  });

  it("문단 스타일을 고르면 커서가 있는 줄을 제목으로 바꾼다", () => {
    render(<Harness initial="제목" />);
    selectRange(1, 1);
    fireEvent.change(screen.getByLabelText("문단 스타일"), { target: { value: "2" } });
    expect(textarea().value).toBe("## 제목");
  });

  it("붙여넣은 이미지는 자리표시자를 거쳐 버킷 키로 들어간다", async () => {
    const upload = vi.fn(async () => ["post-images-public:2026-10-22/a.png"]);
    render(<Harness initial="앞 " upload={upload} />);
    selectRange(2, 2);
    const file = new File(["x"], "a.png", { type: "image/png" });
    fireEvent.paste(textarea(), { clipboardData: { files: [file] } });

    await waitFor(() => expect(textarea().value).toBe("앞 ![](post-images-public:2026-10-22/a.png)"));
    expect(upload).toHaveBeenCalledWith([file]);
  });

  it("업로드에 실패하면 자리표시자를 지운다", async () => {
    render(<Harness initial="앞 " upload={async () => []} />);
    selectRange(2, 2);
    const file = new File(["x"], "a.png", { type: "image/png" });
    fireEvent.paste(textarea(), { clipboardData: { files: [file] } });

    await waitFor(() => expect(textarea().value).toBe("앞 "));
  });

  it("이미지가 아닌 붙여넣기는 그대로 둔다", () => {
    const upload = vi.fn(async () => []);
    render(<Harness initial="" upload={upload} />);
    fireEvent.paste(textarea(), { clipboardData: { files: [] } });
    expect(upload).not.toHaveBeenCalled();
  });
});
