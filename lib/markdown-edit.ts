// 마크다운 에디터 툴바 동작. 본문과 선택 영역을 받아 "어디를 무엇으로 바꾸고 선택을 어디에 둘지"를 돌려준다.
// 실제 반영은 에디터가 CodeMirror 트랜잭션 하나로 해서 ⌘Z 한 번에 되돌린다.

export type TextSelection = { value: string; start: number; end: number };
export type TextEdit = {
  from: number;
  to: number;
  insert: string;
  selectionStart: number;
  selectionEnd: number;
};

export function applyEdit({ value }: TextSelection, edit: TextEdit): TextSelection {
  return {
    value: value.slice(0, edit.from) + edit.insert + value.slice(edit.to),
    start: edit.selectionStart,
    end: edit.selectionEnd,
  };
}

export function toggleInline({ value, start, end }: TextSelection, marker: string): TextEdit {
  const size = marker.length;
  const selected = value.slice(start, end);
  const before = start >= size ? value.slice(start - size, start) : "";
  const after = value.slice(end, end + size);
  // `*`(기울임)가 `**`(굵게)의 절반이면 감싼 것으로 보지 않는다.
  const halfOfLonger = size === 1 && (value[start - size - 1] === marker || value[end + size] === marker);

  if (before === marker && after === marker && !halfOfLonger) {
    return { from: start - size, to: end + size, insert: selected, selectionStart: start - size, selectionEnd: end - size };
  }
  if (selected.length >= size * 2 && selected.startsWith(marker) && selected.endsWith(marker)) {
    return { from: start, to: end, insert: selected.slice(size, -size), selectionStart: start, selectionEnd: end - size * 2 };
  }
  // 서식을 켜고 쓰다가 다시 누른 경우다. 기호를 또 넣으면 짝 없는 기호가 글자로 보인다.
  if (start === end && after === marker && !halfOfLonger) {
    return { from: start, to: start, insert: "", selectionStart: start + size, selectionEnd: start + size };
  }
  return { from: start, to: end, insert: marker + selected + marker, selectionStart: start + size, selectionEnd: end + size };
}

// 선택이 닿은 줄 전체. 다음 줄 맨 앞에서 끝난 선택은 그 줄을 넣지 않는다.
function touchedLines({ value, start, end }: TextSelection) {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lastPos = end > start && value[end - 1] === "\n" ? end - 1 : end;
  const newline = value.indexOf("\n", lastPos);
  const lineEnd = newline === -1 ? value.length : newline;
  return { lineStart, lineEnd, lines: value.slice(lineStart, lineEnd).split("\n") };
}

function replaceLines(selection: TextSelection, transform: (lines: string[]) => string[]): TextEdit {
  const { lineStart, lineEnd, lines } = touchedLines(selection);
  const insert = transform(lines).join("\n");
  if (selection.start === selection.end && lines.length === 1) {
    const cursor = Math.max(lineStart, selection.start + insert.length - (lineEnd - lineStart));
    return { from: lineStart, to: lineEnd, insert, selectionStart: cursor, selectionEnd: cursor };
  }
  return { from: lineStart, to: lineEnd, insert, selectionStart: lineStart, selectionEnd: lineStart + insert.length };
}

const LINE_PREFIX = {
  bullet: /^[-*+] /,
  ordered: /^\d+\. /,
  quote: /^> /,
} as const;
const LIST_PREFIX = /^(?:[-*+]|\d+\.) /;

export type LinePrefixKind = keyof typeof LINE_PREFIX;

export function toggleLinePrefix(selection: TextSelection, kind: LinePrefixKind): TextEdit {
  const pattern = LINE_PREFIX[kind];
  return replaceLines(selection, (lines) => {
    // 여러 줄이면 빈 줄은 건너뛴다(빈 목록 항목·빈 인용을 만들지 않는다).
    const skip = (line: string) => lines.length > 1 && line.trim() === "";
    const targets = lines.filter((line) => !skip(line));
    if (targets.every((line) => pattern.test(line))) {
      return lines.map((line) => line.replace(pattern, ""));
    }
    let number = 0;
    return lines.map((line) => {
      if (skip(line)) return line;
      const body = kind === "quote" ? line.replace(LINE_PREFIX.quote, "") : line.replace(LIST_PREFIX, "");
      number += 1;
      if (kind === "bullet") return `- ${body}`;
      if (kind === "ordered") return `${number}. ${body}`;
      return `> ${body}`;
    });
  });
}

export function setHeading(selection: TextSelection, level: 0 | 1 | 2 | 3): TextEdit {
  const prefix = level === 0 ? "" : `${"#".repeat(level)} `;
  return replaceLines(selection, (lines) => lines.map((line) => prefix + line.replace(/^#{1,6} /, "")));
}

// 블록 문법은 위아래에 빈 줄이 있어야 한다. 바로 위 줄에 붙은 `---`는 제목(setext)으로 읽힌다.
function blockPadding(value: string, start: number, end: number) {
  const before = value.slice(0, start);
  const after = value.slice(end);
  return {
    before: before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n",
    after: after === "" ? "\n" : after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n",
  };
}

export function insertBlock({ value, start, end }: TextSelection, kind: "rule" | "code"): TextEdit {
  const { before, after } = blockPadding(value, start, end);
  if (kind === "rule") {
    const insert = `${before}---${after}`;
    return { from: start, to: end, insert, selectionStart: start + insert.length, selectionEnd: start + insert.length };
  }
  const insert = `${before}\`\`\`\n${value.slice(start, end)}\n\`\`\`${after}`;
  // 여는 ``` 바로 뒤에 커서를 두어 언어 이름을 바로 쓰게 한다.
  const cursor = start + before.length + 3;
  return { from: start, to: end, insert, selectionStart: cursor, selectionEnd: cursor };
}

export function insertLink({ value, start, end }: TextSelection): TextEdit {
  const selected = value.slice(start, end);
  if (/^https?:\/\/\S+$/.test(selected)) {
    return { from: start, to: end, insert: `[](${selected})`, selectionStart: start + 1, selectionEnd: start + 1 };
  }
  const urlStart = start + selected.length + 3;
  return {
    from: start,
    to: end,
    insert: `[${selected}](https://)`,
    selectionStart: urlStart,
    selectionEnd: urlStart + "https://".length,
  };
}
