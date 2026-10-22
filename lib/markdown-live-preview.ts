import { Language, defineLanguageFacet, syntaxTree } from "@codemirror/language";
import { StateField, type EditorState, type Extension, type Range } from "@codemirror/state";
import { Decoration, EditorView, WidgetType, type DecorationSet } from "@codemirror/view";
import katex from "katex/dist/katex.js";
import { PRIVATE_IMAGE_BUCKET, PUBLIC_IMAGE_BUCKET, coverSrcFromImageKey } from "@/lib/image";
import { blogMarkdownParser } from "@/lib/markdown-syntax";

// 작성 칸 라이브 프리뷰. 커서(선택 영역)가 걸친 줄은 기호를 흐리게 드러내고, 나머지 줄은 기호를 숨기거나 위젯으로 바꾼다.
// 서식(굵게·제목 크기 등)은 커서 줄에도 입힌다. 한글 조합은 늘 커서 줄에서 일어나므로 조합 중에 기호가 숨었다 나타나지 않는다.

const IMAGE_KEY = new RegExp(`^(?:${PUBLIC_IMAGE_BUCKET}|${PRIVATE_IMAGE_BUCKET}):`);

const INLINE_STYLES: Record<string, string> = {
  Emphasis: "cm-md-em",
  StrongEmphasis: "cm-md-strong",
  Strikethrough: "cm-md-strike",
  Highlight: "cm-md-highlight",
  Underline: "cm-md-underline",
  InlineCode: "cm-md-code",
};
const INLINE_MARKS = new Set(["EmphasisMark", "StrikethroughMark", "HighlightMark", "UnderlineMark"]);
const HEADING_LEVEL = /^ATXHeading([1-6])$/;
const SETEXT_LEVEL = /^SetextHeading([12])$/;

// 위젯은 누르면 그 자리에 커서를 두어 원문을 드러내야 하므로 이벤트를 에디터가 받게 한다.
abstract class EditableWidget extends WidgetType {
  ignoreEvent() {
    return false;
  }
}

class ImageWidget extends EditableWidget {
  constructor(
    readonly src: string,
    readonly alt: string
  ) {
    super();
  }

  eq(other: ImageWidget) {
    return other.src === this.src && other.alt === this.alt;
  }

  toDOM(view: EditorView) {
    const image = document.createElement("img");
    image.src = this.src;
    image.alt = this.alt;
    image.className = "cm-md-image";
    // 이미지가 늦게 열려 줄 높이가 바뀌면 에디터가 다시 재게 한다.
    image.onload = () => view.requestMeasure();
    return image;
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

function buildDecorations(state: EditorState): DecorationSet {
  const { doc } = state;
  const ranges: Range<Decoration>[] = [];
  const activeLines = state.selection.ranges.map((range) => ({
    from: doc.lineAt(range.from).from,
    to: doc.lineAt(range.to).to,
  }));
  const isActive = (from: number, to: number) =>
    activeLines.some((line) => from <= line.to && to >= line.from);

  // 커서 줄의 기호는 숨기지 않고 흐리게 보여 본문 글자와 구분한다.
  const addHidden = (from: number, to: number) => {
    if (from >= to) return;
    ranges.push(isActive(from, to) ? markDecoration("cm-md-syntax").range(from, to) : hide.range(from, to));
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
      if (INLINE_MARKS.has(name) || (name === "CodeMark" && parent === "InlineCode")) {
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
            addHidden(from, doc.sliceString(to, to + 1) === " " ? to + 1 : to);
          } else {
            addHidden(doc.sliceString(from - 1, from) === " " ? from - 1 : from, to);
          }
          return;
        }
        case "Blockquote":
          addLines(from, to, "cm-md-quote");
          return;
        case "QuoteMark":
          addHidden(from, doc.sliceString(to, to + 1) === " " ? to + 1 : to);
          return;
        case "ListMark": {
          const isBullet = node.parent?.parent?.name === "BulletList";
          const isTask = node.nextSibling?.name === "Task";
          if (isBullet && !isTask && !isActive(from, to)) ranges.push(bullet.range(from, to));
          return;
        }
        case "HorizontalRule":
          if (!isActive(from, to)) ranges.push(rule.range(from, to));
          return;
        case "FencedCode":
        case "CodeBlock":
          addLines(from, to, "cm-md-codeblock");
          return;
        case "CodeMark":
        case "CodeInfo":
          ranges.push(markDecoration("cm-md-syntax").range(from, to));
          return;
        case "Escape":
          addHidden(from, from + 1);
          return;
        case "Link": {
          // `[공지]`처럼 주소가 없는 대괄호는 글 화면에서 글자로 나오므로 링크로 꾸미지 않는다.
          const [open, close] = node.getChildren("LinkMark");
          if (!open || !close || !node.getChild("URL")) return;
          if (open.to < close.from) ranges.push(markDecoration("cm-md-link").range(open.to, close.from));
          addHidden(open.from, open.to);
          addHidden(close.from, to);
          return;
        }
        case "URL":
          if (parent !== "Link" && parent !== "Image") ranges.push(markDecoration("cm-md-link").range(from, to));
          return;
        case "Image": {
          const url = node.getChild("URL");
          if (!url) return false;
          const key = doc.sliceString(url.from, url.to);
          const [open, close] = node.getChildren("LinkMark");
          const alt = open && close ? doc.sliceString(open.to, close.from) : "";
          const widget = new ImageWidget(IMAGE_KEY.test(key) ? coverSrcFromImageKey(key) : key, alt);
          // 커서 줄에서도 방금 올린 이미지가 보여야 하므로 원문은 두고 그 뒤에 이미지를 붙인다.
          ranges.push(
            isActive(from, to)
              ? Decoration.widget({ widget, side: 1 }).range(to)
              : Decoration.replace({ widget }).range(from, to)
          );
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

  return Decoration.set(ranges, true);
}

export const livePreviewField = StateField.define<DecorationSet>({
  create: buildDecorations,
  update(decorations, tr) {
    // 긴 글은 파싱이 나눠서 끝나므로 구문 트리가 늘어날 때도 다시 만든다.
    if (tr.docChanged || tr.selection || syntaxTree(tr.state) !== syntaxTree(tr.startState)) {
      return buildDecorations(tr.state);
    }
    return decorations;
  },
  provide: (field) => EditorView.decorations.from(field),
});

const blogMarkdownLanguage = new Language(defineLanguageFacet(), blogMarkdownParser, [], "markdown");

export const markdownLivePreview: Extension = [blogMarkdownLanguage.extension, livePreviewField];
