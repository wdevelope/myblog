import {
  GFM,
  parser as commonmarkParser,
  type BlockContext,
  type InlineContext,
  type Line,
  type MarkdownConfig,
} from "@lezer/markdown";

// 에디터 작성 칸이 쓰는 마크다운 파서. 글 화면(markdown-it)에 붙인 플러그인 문법을 같은 규칙으로 읽는다.
// 형광펜 `==`·밑줄 `++`는 markdown-it-mark·markdown-it-ins, 수식 `$`·`$$`는 @vscode/markdown-it-katex를 따른다.

const DOLLAR = 36;
const BACKSLASH = 92;
const PUNCTUATION = /[\p{S}\p{P}]/u;
const WHITESPACE = /\s|^$/;

// GFM 취소선(`~~`)과 같은 구분자 규칙이다. `===`처럼 세 개 이상이면 서식으로 보지 않는다.
function pairedDelimiter(name: string, char: number): MarkdownConfig {
  const delimiter = { resolve: name, mark: `${name}Mark` };
  return {
    defineNodes: [name, `${name}Mark`],
    parseInline: [
      {
        name,
        parse(cx, next, pos) {
          if (next !== char || cx.char(pos + 1) !== char || cx.char(pos + 2) === char) return -1;
          const before = cx.slice(pos - 1, pos);
          const after = cx.slice(pos + 2, pos + 3);
          const spaceBefore = WHITESPACE.test(before);
          const spaceAfter = WHITESPACE.test(after);
          const punctBefore = PUNCTUATION.test(before);
          const punctAfter = PUNCTUATION.test(after);
          return cx.addDelimiter(
            delimiter,
            pos,
            pos + 2,
            !spaceAfter && (!punctAfter || spaceBefore || punctBefore),
            !spaceBefore && (!punctBefore || spaceAfter || punctAfter)
          );
        },
        after: "Emphasis",
      },
    ],
  };
}

function isWordChar(char: string) {
  return /^[\w\d]$/u.test(char);
}

// 백슬래시가 홀수 개 앞에 붙은 구분자는 이스케이프된 글자다.
function findUnescaped(cx: InlineContext, marker: string, from: number) {
  const text = cx.slice(from, cx.end);
  for (let index = text.indexOf(marker); index >= 0; index = text.indexOf(marker, index + marker.length)) {
    let backslashes = 0;
    while (cx.char(from + index - backslashes - 1) === BACKSLASH) backslashes++;
    if (backslashes % 2 === 0) return from + index;
  }
  return -1;
}

function canOpenInline(cx: InlineContext, pos: number) {
  const before = cx.slice(pos - 1, pos);
  return before !== "$" && before !== "\\" && (before === "" || /\s/.test(before) || !isWordChar(before));
}

function canCloseInline(cx: InlineContext, pos: number) {
  const after = cx.slice(pos + 1, pos + 2);
  return after !== "$" && (after === "" || /\s/.test(after) || !isWordChar(after));
}

function isDisplayDelimiter(cx: InlineContext, pos: number) {
  const before = cx.slice(pos - 1, pos);
  return before !== "$" && before !== "\\" && cx.char(pos + 1) === DOLLAR && cx.char(pos + 2) !== DOLLAR;
}

// 문단 안의 `$$…$$`는 글 화면에서 블록 수식으로 그려진다. 노드는 InlineMath로 두고 구분자 길이로 구분한다.
function parseInlineMath(cx: InlineContext, next: number, pos: number) {
  if (next !== DOLLAR) return -1;
  const display = cx.char(pos + 1) === DOLLAR;
  const size = display ? 2 : 1;
  if (display ? !isDisplayDelimiter(cx, pos) : !canOpenInline(cx, pos)) return -1;

  const close = findUnescaped(cx, display ? "$$" : "$", pos + size);
  if (close < 0 || close === pos + size) return -1;
  if (display ? !isDisplayDelimiter(cx, close) : !canCloseInline(cx, close)) return -1;

  return cx.addElement(
    cx.elt("InlineMath", pos, close + size, [
      cx.elt("InlineMathMark", pos, pos + size),
      cx.elt("InlineMathMark", close, close + size),
    ])
  );
}

// 첫 줄의 `$$` 뒤에 `$$`가 둘 이상 있으면 블록이 아니라 문단 안의 수식이다.
function blockMathCloses(line: Line) {
  if (
    line.next !== DOLLAR ||
    line.text.charCodeAt(line.pos + 1) !== DOLLAR ||
    line.indent - line.baseIndent >= 4
  )
    return null;
  const closes = [...line.text.slice(line.pos + 2).matchAll(/\$\$/g)];
  return closes.length > 1 ? null : closes;
}

// `$$`로 시작하는 줄부터 `$$`가 나오는 줄까지. 첫 줄이 `$$…$$`로 끝나면 한 줄짜리다.
function parseBlockMath(cx: BlockContext, line: Line) {
  const closes = blockMathCloses(line);
  if (!closes) return false;
  const from = cx.lineStart + line.pos;
  const rest = line.text.slice(line.pos + 2);

  const marks = [cx.elt("BlockMathMark", from, from + 2)];
  if (closes.length === 1 && closes[0].index === rest.length - 2) {
    const close = from + 2 + closes[0].index;
    marks.push(cx.elt("BlockMathMark", close, close + 2));
    cx.nextLine();
    cx.addElement(cx.elt("BlockMath", from, close + 2, marks));
    return true;
  }

  // 인용·목록 안의 블록이 그 바깥 줄로 넘어가지 않게 한다. `Line.depth`는 공개 타입에 없지만 FencedCode가 같은 값으로 이 검사를 한다.
  while (cx.nextLine() && (line as Line & { depth: number }).depth >= cx.depth) {
    marks.push(...line.markers);
    const text = line.text;
    if (!text.includes("$$", line.pos)) continue;
    const index = text.trimEnd().endsWith("$$") ? text.lastIndexOf("$$") : text.indexOf("$$", line.pos);
    marks.push(cx.elt("BlockMathMark", cx.lineStart + index, cx.lineStart + index + 2));
    cx.nextLine();
    break;
  }
  cx.addElement(cx.elt("BlockMath", from, cx.prevLineEnd(), marks));
  return true;
}

const Highlight = pairedDelimiter("Highlight", "=".charCodeAt(0));
const Underline = pairedDelimiter("Underline", "+".charCodeAt(0));

const MathSyntax: MarkdownConfig = {
  defineNodes: [
    "InlineMath",
    "InlineMathMark",
    { name: "BlockMath", block: true },
    "BlockMathMark",
  ],
  parseInline: [{ name: "InlineMath", parse: parseInlineMath }],
  parseBlock: [
    {
      name: "BlockMath",
      parse: parseBlockMath,
      // 글 화면처럼 문단 중간의 `$$` 줄도 블록 수식을 시작한다.
      endLeaf: (_cx, line) => blockMathCloses(line) !== null,
      before: "FencedCode",
    },
  ],
};

export const blogMarkdownParser = commonmarkParser.configure([GFM, Highlight, Underline, MathSyntax]);
