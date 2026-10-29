import { EditorSelection, EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { coverSrcFromImageKey } from "@/lib/image";
import { livePreviewField, markdownLivePreview } from "@/lib/markdown-live-preview";

// `‸`는 커서, `«`…`»`는 선택 영역이다. 장식을 "종류:대상" 글자로 바꿔 시작 위치 순서(같으면 긴 것 먼저)로 돌려준다.
function preview(source: string) {
  const anchor = source.search(/[‸«]/);
  const head = source.includes("«") ? source.indexOf("»") - 1 : anchor;
  const doc = source.replace(/[‸«»]/g, "");
  const state = EditorState.create({
    doc,
    selection: EditorSelection.range(anchor, head),
    extensions: markdownLivePreview,
  });
  const found: { from: number; to: number; label: string }[] = [];
  state.field(livePreviewField).decorations.between(0, doc.length, (from, to, value) => {
    const text = doc.slice(from, to);
    const widget = value.spec.widget;
    let label: string;
    if (widget?.src) {
      const { width, align } = widget.options;
      label = `image:${widget.src}${width ? `:w${width}` : ""}${align ? `:${align}` : ""}${widget.selected ? ":선택" : ""}`;
    }
    else if (from === to) label = `line:${value.spec.class}@${state.doc.lineAt(from).number}`;
    else if (!widget) label = value.spec.class ? `${value.spec.class}:${text}` : `hide:${text}`;
    else if (widget.tex) label = `math:${widget.tex}:${widget.display ? "display" : "inline"}`;
    else label = `${widget.className}:${text}`;
    found.push({ from, to, label });
  });
  return found.sort((a, b) => a.from - b.from || b.to - a.to).map((item) => item.label);
}

describe("작성 칸 라이브 프리뷰", () => {
  it("굵게 기호는 커서 줄에서도 숨기고 서식을 입힌다", () => {
    expect(preview("**굵게**\n‸")).toEqual(["cm-md-strong:**굵게**", "hide:**", "hide:**"]);
    expect(preview("**굵‸게**")).toEqual(["cm-md-strong:**굵게**", "hide:**", "hide:**"]);
  });

  it("기울임·취소선·형광펜·밑줄·인라인 코드 기호도 커서·선택과 상관없이 숨긴다", () => {
    expect(preview("*기‸울임*")).toEqual(["cm-md-em:*기울임*", "hide:*", "hide:*"]);
    expect(preview("«==가==\n++나++»\n~~다~~ `라`")).toEqual([
      "cm-md-highlight:==가==",
      "hide:==",
      "hide:==",
      "cm-md-underline:++나++",
      "hide:++",
      "hide:++",
      "cm-md-strike:~~다~~",
      "hide:~~",
      "hide:~~",
      "cm-md-code:`라`",
      "hide:`",
      "hide:`",
    ]);
  });

  it("문장부호로 끝난 굵게 뒤에 조사가 붙어도 기호를 숨긴다", () => {
    expect(preview('**"중요"**는\n‸')).toEqual(['cm-md-strong:**"중요"**', "hide:**", "hide:**"]);
  });

  it("선택이 여러 줄에 걸치면 그 줄 모두 제목·인용 기호를 드러낸다", () => {
    expect(preview("«## 가\n> 나»\n\n## 다")).toEqual([
      "cm-md-syntax:## ",
      "line:cm-md-h2@1",
      "cm-md-syntax:> ",
      "line:cm-md-quote@2",
      "hide:## ",
      "line:cm-md-h2@4",
    ]);
  });

  it("제목은 `#`과 뒤 공백을 숨기고 줄에 제목 크기를 입힌다", () => {
    expect(preview("## 제목\n‸")).toEqual(["hide:## ", "line:cm-md-h2@1"]);
    expect(preview("## 제‸목")).toEqual(["cm-md-syntax:## ", "line:cm-md-h2@1"]);
  });

  it("글머리 목록 기호는 점으로 바꾸고, 번호 목록과 체크리스트는 그대로 둔다", () => {
    expect(preview("- 하나\n1. 둘\n\n- [ ] 셋\n‸")).toEqual(["cm-md-bullet:-"]);
  });

  it("인용은 `>`를 숨기고 줄마다 인용 선을 긋는다", () => {
    expect(preview("> 인용\n\n‸")).toEqual(["hide:> ", "line:cm-md-quote@1"]);
  });

  it("이미지는 커서 줄에서도 경로를 숨기고 키를 이미지 주소로 바꿔 그린다", () => {
    const key = "post-images-private:2026-10-22/a.png";
    expect(preview(`![설명](${key})\n‸`)).toEqual([`image:${coverSrcFromImageKey(key)}`]);
    expect(preview("![](https://example.com/a.png)\n‸")).toEqual(["image:https://example.com/a.png"]);
    expect(preview(`앞 ![](${key})‸`)).toEqual([`image:${coverSrcFromImageKey(key)}`]);
  });

  it("이미지 주소 끝 조각의 폭·정렬을 위젯에 넘기고 주소에서 뗀다", () => {
    const key = "post-images-private:2026-10-22/a.png";
    expect(preview(`![](${key}#w=60&align=center)\n‸`)).toEqual([`image:${coverSrcFromImageKey(key)}:w60:center`]);
  });

  it("선택 영역이 이미지를 덮으면 이미지를 선택 상태로 그린다", () => {
    expect(preview("앞 «![](https://example.com/a.png)»")).toEqual(["image:https://example.com/a.png:선택"]);
    expect(preview("«앞 ![](https://exa»mple.com/a.png)")).toEqual(["image:https://example.com/a.png"]);
  });

  it("이미지와 숨긴 인라인 서식 기호만 커서가 건너뛰는 한 덩어리로 다룬다", () => {
    const doc = "## **굵게** [a](b) ![](https://example.com/a.png)";
    const state = EditorState.create({ doc, extensions: markdownLivePreview });
    const atomic: string[] = [];
    state.field(livePreviewField).atomic.between(0, doc.length, (from, to) => {
      atomic.push(doc.slice(from, to));
    });
    expect(atomic).toEqual(["**", "**", "![](https://example.com/a.png)"]);
  });

  it("커서가 `$$` 블록 안이면 블록 전체가 원문이고, 밖이면 수식 하나로 그린다", () => {
    expect(preview("$$\na+b\n$$\n\n‸")).toEqual(["math:a+b:display"]);
    expect(preview("$$\na‸+b\n$$")).toEqual([]);
    expect(preview("값 $x^2$ 와 $$y$$\n‸")).toEqual(["math:x^2:inline", "math:y:display"]);
  });

  it("코드블록은 줄마다 배경을 깔고 펜스는 흐리게만 둔다", () => {
    expect(preview("```js\n**x**\n```\n‸")).toEqual([
      "cm-md-syntax:```",
      "line:cm-md-codeblock@1",
      "cm-md-syntax:js",
      "line:cm-md-codeblock@2",
      "cm-md-syntax:```",
      "line:cm-md-codeblock@3",
    ]);
  });

  it("인라인 코드는 백틱을 숨기고 안의 기호는 글자로 둔다", () => {
    expect(preview("`**x**`\n‸")).toEqual(["cm-md-code:`**x**`", "hide:`", "hide:`"]);
  });

  it("링크는 글자만 링크로 보이고 주소를 숨긴다", () => {
    expect(preview("[블로그](https://example.com)\n‸")).toEqual([
      "hide:[",
      "cm-md-link:블로그",
      "hide:](https://example.com)",
    ]);
  });

  it("주소가 없는 대괄호 글자는 링크로 보지 않는다", () => {
    expect(preview("[공지] 안내\n‸")).toEqual([]);
  });

  it("이스케이프 백슬래시는 커서 밖에서 숨긴다", () => {
    expect(preview("\\$5\n‸")).toEqual(["hide:\\"]);
  });

  it("구분선은 커서 밖에서 선으로 그린다", () => {
    expect(preview("앞\n\n---\n\n‸")).toEqual(["cm-md-rule:---"]);
  });

  it("표는 장식하지 않는다", () => {
    expect(preview("| a |\n| - |\n| b |\n‸")).toEqual([]);
  });
});
