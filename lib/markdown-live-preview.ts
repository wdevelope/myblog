import { Language, defineLanguageFacet, syntaxTree } from "@codemirror/language";
import { StateField, type EditorState, type Extension, type Range } from "@codemirror/state";
import { Decoration, EditorView, WidgetType, type DecorationSet } from "@codemirror/view";
import katex from "katex/dist/katex.js";
import { PRIVATE_IMAGE_BUCKET, PUBLIC_IMAGE_BUCKET, coverSrcFromImageKey } from "@/lib/image";
import { parseImageUrl } from "@/lib/image-options";
import { hiddenMarkGuard, isHiddenMark, isLinkOpen, linkMarks } from "@/lib/markdown-hidden-marks";
import { ImageWidget } from "@/lib/markdown-image-widget";
import { blogMarkdownParser } from "@/lib/markdown-syntax";

// 작성 칸 라이브 프리뷰. 기호는 커서 위치와 상관없이 숨기거나 위젯으로 바꾼다. 쓰는 동안 줄이 바뀌지 않게 하려는 사용자 결정이다.
// 원문을 드러내는 곳은 고치려면 봐야 하는 둘이다. 링크는 커서가 링크 안에 있을 때, 수식은 커서가 그 줄에 있을 때다.
// 기호를 숨겨 생기는 커서·지우기 문제는 lib/markdown-hidden-marks가 다룬다.

const IMAGE_KEY = new RegExp(`^(?:${PUBLIC_IMAGE_BUCKET}|${PRIVATE_IMAGE_BUCKET}):`);

const INLINE_STYLES: Record<string, string> = {
  Emphasis: "cm-md-em",
  StrongEmphasis: "cm-md-strong",
  Strikethrough: "cm-md-strike",
  Highlight: "cm-md-highlight",
  Underline: "cm-md-underline",
  InlineCode: "cm-md-code",
};
const HEADING_LEVEL = /^ATXHeading([1-6])$/;
const SETEXT_LEVEL = /^SetextHeading([12])$/;

// 위젯을 눌러도 그 자리에 커서가 서야 하므로 이벤트를 에디터가 받게 한다.
abstract class EditableWidget extends WidgetType {
  ignoreEvent() {
    return false;
  }
}

class MathWidget extends EditableWidget {
  constructor(
    readonly tex: string,
    readonly display: boolean
  ) {
    super();
  }

  eq(other: MathWidget) {
    return other.tex === this.tex && other.display === this.display;
  }

  toDOM() {
    const element = document.createElement(this.display ? "div" : "span");
    element.className = this.display ? "cm-md-math-display" : "cm-md-math";
    katex.render(this.tex, element, { throwOnError: false, displayMode: this.display });
    return element;
  }
}

class TextWidget extends EditableWidget {
  constructor(
    readonly text: string,
    readonly className: string
  ) {
    super();
  }

  eq(other: TextWidget) {
    return other.text === this.text && other.className === this.className;
  }

  toDOM() {
    const element = document.createElement("span");
    element.className = this.className;
    element.textContent = this.text;
    return element;
  }
}

const hide = Decoration.replace({});
const bullet = Decoration.replace({ widget: new TextWidget("•", "cm-md-bullet") });
const rule = Decoration.replace({ widget: new TextWidget("", "cm-md-rule") });
const marks = new Map<string, Decoration>();
const lines = new Map<string, Decoration>();

function markDecoration(className: string) {
  let decoration = marks.get(className);
  if (!decoration) marks.set(className, (decoration = Decoration.mark({ class: className })));
  return decoration;
}

function lineDecoration(className: string) {
  let decoration = lines.get(className);
  if (!decoration) lines.set(className, (decoration = Decoration.line({ class: className })));
  return decoration;
}

type LivePreview = { decorations: DecorationSet; atomic: DecorationSet };

function buildDecorations(state: EditorState): LivePreview {
  const { doc } = state;
  const ranges: Range<Decoration>[] = [];
  const atomic: Range<Decoration>[] = [];
  const activeLines = state.selection.ranges.map((range) => ({
    from: doc.lineAt(range.from).from,
    to: doc.lineAt(range.to).to,
  }));
  const isActive = (from: number, to: number) =>
    activeLines.some((line) => from <= line.to && to >= line.from);

  // 보이지 않는 기호 사이에 커서가 멈추면 방향키가 먹지 않는 것처럼 보여 한 덩어리로 건너뛰게 한다.
  const addHidden = (from: number, to: number) => {
    if (from >= to) return;
    const mark = hide.range(from, to);
    ranges.push(mark);
    atomic.push(mark);
  };
  // 막 친 기호는 뒤에 글자가 이어지면 문법이 아니므로, 공백이 붙기 전까지 커서 줄에서는 숨기지 않아 글자가 사라졌다 나타나지 않게 한다.
  const isTyping = (from: number, to: number) => doc.sliceString(to, to + 1) !== " " && isActive(from, to);
  const addPrefix = (from: number, to: number) => {
    if (isTyping(from, to)) ranges.push(markDecoration("cm-md-syntax").range(from, to));
    else addHidden(from, doc.sliceString(to, to + 1) === " " ? to + 1 : to);
  };
  const addLines = (from: number, to: number, className: string) => {
    for (let pos = from; pos <= to; ) {
      const line = doc.lineAt(pos);
      ranges.push(lineDecoration(className).range(line.from));
      pos = line.to + 1;
    }
  };

  syntaxTree(state).iterate({
    enter(ref) {
      const { name, from, to } = ref;
      const node = ref.node;
      const parent = node.parent?.name;

      const inlineStyle = INLINE_STYLES[name];
      if (inlineStyle) {
        ranges.push(markDecoration(inlineStyle).range(from, to));
        return;
      }
      if (isHiddenMark(name, parent)) {
        addHidden(from, to);
        return;
      }

      const heading = HEADING_LEVEL.exec(name) ?? SETEXT_LEVEL.exec(name);
      if (heading) {
        ranges.push(lineDecoration(`cm-md-h${heading[1]}`).range(doc.lineAt(from).from));
        return;
      }

      switch (name) {
        case "HeaderMark": {
          // Setext 밑줄(`===`·`---`)을 숨기면 빈 줄만 남으므로 흐리게만 둔다.
          if (parent?.startsWith("Setext")) {
            ranges.push(markDecoration("cm-md-syntax").range(from, to));
          } else if (node.parent && from === node.parent.from) {
            addPrefix(from, to);
          } else {
            addHidden(doc.sliceString(from - 1, from) === " " ? from - 1 : from, to);
          }
          return;
        }
        case "Blockquote":
          addLines(from, to, "cm-md-quote");
          return;
        case "QuoteMark":
          addPrefix(from, to);
          return;
        case "ListMark": {
          const isBullet = node.parent?.parent?.name === "BulletList";
          const isTask = node.nextSibling?.name === "Task";
          if (!isBullet || isTask || isTyping(from, to)) return;
          ranges.push(bullet.range(from, to));
          atomic.push(bullet.range(from, doc.sliceString(to, to + 1) === " " ? to + 1 : to));
          return;
        }
        case "HorizontalRule": {
          // 선택 없이 굵게를 누르면 `****` 사이에 커서가 선다. 구분선으로 읽혀도 쓰는 중이므로 글자로 둔다.
          const { head } = state.selection.main;
          if (from < head && head < to) return;
          const line = rule.range(from, to);
          ranges.push(line);
          atomic.push(line);
          return;
        }
        case "FencedCode":
        case "CodeBlock":
          addLines(from, to, "cm-md-codeblock");
          return;
        case "CodeMark":
        case "CodeInfo":
          ranges.push(markDecoration("cm-md-syntax").range(from, to));
          return;
        case "Escape":
          // `\\*`는 보이는 글자 하나다. 백슬래시 뒤에 서서 쓰면 이스케이프가 풀려 백슬래시가 글자로 드러난다.
          ranges.push(hide.range(from, from + 1));
          atomic.push(hide.range(from, to));
          return;
        case "Link": {
          const marks = linkMarks(node);
          if (!marks) return;
          const { open, close } = marks;
          if (open.to < close.from) ranges.push(markDecoration("cm-md-link").range(open.to, close.from));
          if (isLinkOpen(state, node)) {
            ranges.push(markDecoration("cm-md-syntax").range(open.from, open.to));
            ranges.push(markDecoration("cm-md-syntax").range(close.from, close.to));
          } else {
            addHidden(open.from, open.to);
            addHidden(close.from, close.to);
          }
          return;
        }
        case "URL":
          if (parent !== "Link" && parent !== "Image") ranges.push(markDecoration("cm-md-link").range(from, to));
          return;
        case "Image": {
          const url = node.getChild("URL");
          if (!url) return false;
          const { src, options } = parseImageUrl(doc.sliceString(url.from, url.to));
          const [open, close] = node.getChildren("LinkMark");
          const alt = open && close ? doc.sliceString(open.to, close.from) : "";
          const selected = state.selection.ranges.some(
            (range) => !range.empty && range.from <= from && range.to >= to
          );
          const widget = new ImageWidget(IMAGE_KEY.test(src) ? coverSrcFromImageKey(src) : src, alt, options, selected);
          // 경로를 늘 숨기므로 커서가 문법 안으로 들어가지 못하게 한 덩어리로 둔다. 지우면 문법 전체가 지워진다.
          const image = Decoration.replace({ widget }).range(from, to);
          ranges.push(image);
          atomic.push(image);
          return false;
        }
        case "InlineMath":
        case "BlockMath": {
          if (isActive(from, to)) return false;
          const delimiters = node.getChildren(`${name}Mark`);
          const open = delimiters[0];
          const close = delimiters.length > 1 ? delimiters[delimiters.length - 1] : null;
          const tex = doc.sliceString(open.to, close ? close.from : to).trim();
          const display = name === "BlockMath" || open.to - open.from === 2;
          ranges.push(Decoration.replace({ widget: new MathWidget(tex, display) }).range(from, to));
          return false;
        }
      }
    },
  });

  return { decorations: Decoration.set(ranges, true), atomic: Decoration.set(atomic, true) };
}

export const livePreviewField = StateField.define<LivePreview>({
  create: buildDecorations,
  update(value, tr) {
    // 긴 글은 파싱이 나눠서 끝나므로 구문 트리가 늘어날 때도 다시 만든다.
    if (tr.docChanged || tr.selection || syntaxTree(tr.state) !== syntaxTree(tr.startState)) {
      return buildDecorations(tr.state);
    }
    return value;
  },
  provide: (field) => [
    EditorView.decorations.from(field, (value) => value.decorations),
    EditorView.atomicRanges.of((view) => view.state.field(field).atomic),
  ],
});

const blogMarkdownLanguage = new Language(defineLanguageFacet(), blogMarkdownParser, [], "markdown");

export const markdownLivePreview: Extension = [blogMarkdownLanguage.extension, livePreviewField, hiddenMarkGuard];
