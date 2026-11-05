import { syntaxTree } from "@codemirror/language";
import {
  EditorSelection,
  EditorState,
  Transaction,
  findClusterBreak,
  type Text,
  type TransactionSpec,
} from "@codemirror/state";

// 작성 칸은 기호를 늘 숨기므로 기호 앞뒤가 화면에서 같은 자리로 보인다.
// 엉뚱한 쪽에 커서가 서서 글을 쓰거나 기호 한쪽만 지우면 문법이 깨져 남은 기호가 글자로 튀어나온다.
// 키보드·마우스·모바일 입력이 모두 트랜잭션을 거치므로 입력 경로마다 막지 않고 여기서 한 번에 다듬는다.

type Side = -1 | 1;
type Range = { from: number; to: number };
type TreeNode = ReturnType<ReturnType<typeof syntaxTree>["resolveInner"]>;

const INLINE_MARKS = new Set(["EmphasisMark", "StrikethroughMark", "HighlightMark", "UnderlineMark"]);

export function isHiddenMark(name: string, parent: string | undefined) {
  return INLINE_MARKS.has(name) || (name === "CodeMark" && parent === "InlineCode");
}

// 링크의 `[`와 `](주소)`. 주소가 없는 `[공지]`는 글 화면에서 글자로 나오므로 링크가 아니다.
export function linkMarks(link: TreeNode) {
  const [open, close] = link.getChildren("LinkMark");
  if (!open || !close || !link.getChild("URL")) return null;
  return { open: { from: open.from, to: open.to }, close: { from: close.from, to: link.to } };
}

// 주소는 보여야 고칠 수 있으므로 커서나 선택이 링크 안쪽에 있는 동안은 링크를 원문으로 둔다.
export function isLinkOpen(state: EditorState, link: Range) {
  const { from, to } = state.selection.main;
  return link.from < from && to < link.to;
}

function markBeside(state: EditorState, pos: number, side: Side) {
  const node = syntaxTree(state).resolveInner(pos, side);
  const parent = node.parent;
  if (node.name === "LinkMark" && parent?.name === "Link") {
    const marks = isLinkOpen(state, parent) ? null : linkMarks(parent);
    if (marks && pos === (side > 0 ? marks.open.from : marks.open.to)) return { ...marks.open, opens: true, closes: false };
    if (marks && pos === (side > 0 ? marks.close.from : marks.close.to)) return { ...marks.close, opens: false, closes: true };
    return null;
  }
  const touches = side > 0 ? node.from === pos : node.to === pos;
  if (!touches || !isHiddenMark(node.name, parent?.name)) return null;
  return { from: node.from, to: node.to, opens: node.from === parent?.from, closes: node.to === parent?.to };
}

// side 쪽에 붙은 숨긴 기호를 모두 넘은 자리. leavingOnly면 서식을 빠져나가는 기호(오른쪽의 닫는 기호, 왼쪽의 여는 기호)만 넘는다.
function pastMarks(state: EditorState, start: number, side: Side, leavingOnly = false) {
  let pos = start;
  for (let mark = markBeside(state, pos, side); mark; mark = markBeside(state, pos, side)) {
    if (leavingOnly && !(side > 0 ? mark.closes : mark.opens)) break;
    pos = side > 0 ? mark.to : mark.from;
  }
  return pos;
}

function isLinePrefix(node: TreeNode) {
  if (node.name === "QuoteMark") return true;
  if (node.name === "HeaderMark") return node.from === node.parent?.from;
  return node.name === "ListMark" && node.parent?.parent?.name === "BulletList" && node.nextSibling?.name !== "Task";
}

// pos가 걸친 줄머리 기호(제목 `#`·인용 `>`·글머리 `-`와 뒤 공백). 붙어 있는 기호는 한 덩어리다.
// 공백 없이 막 친 기호는 뒤에 글자가 이어지면 문법이 아니라 보통 글자로 둔다.
function linePrefix(state: EditorState, pos: number) {
  const line = state.doc.lineAt(pos);
  const chunks: Range[] = [];
  syntaxTree(state).iterate({
    from: line.from,
    to: line.to,
    enter({ node }) {
      if (node.from < line.from || !isLinePrefix(node) || state.sliceDoc(node.to, node.to + 1) !== " ") return;
      const last = chunks.at(-1);
      if (last?.to === node.from) last.to = node.to + 1;
      else chunks.push({ from: node.from, to: node.to + 1 });
    },
  });
  return chunks.find((chunk) => chunk.from <= pos && pos < chunk.to) ?? null;
}

// 사용자가 옮긴 커서를 글을 써도 문법이 깨지지 않는 쪽에 세운다. 줄 끝을 눌러도 커서는 숨은 기호 앞에 서기 때문이다.
function settledCursor(tr: Transaction) {
  const state = tr.startState;
  const { head, assoc, goalColumn } = tr.newSelection.main;
  const from = state.selection.main.head;
  const pointer = tr.isUserEvent("select.pointer");

  // 줄머리 기호 앞에서 쓰면 기호가 문법을 잃으므로 그 앞에는 서지 않는다. 왼쪽 방향키로 넘어온 것이면 한 칸 더 간다.
  const prefix = linePrefix(state, head);
  if (prefix) {
    if (from === prefix.to && assoc > 0 && !pointer && prefix.from > 0) {
      return EditorSelection.cursor(prefix.from - 1, -1, undefined, goalColumn);
    }
    return EditorSelection.cursor(prefix.to, 1, undefined, goalColumn);
  }

  // 줄 앞으로 가는 키는 덩어리를 건너뛰지 않아 이스케이프 안쪽에 설 수 있다.
  const inner = syntaxTree(state).resolveInner(head);
  if (inner.name === "Escape") return EditorSelection.cursor(inner.from, 1, undefined, goalColumn);

  for (const side of [1, -1] as const) {
    const outside = pastMarks(state, head, side, true);
    // 서식 끝에 글을 이어 쓰려면 들어갈 길이 있어야 해서, 바로 바깥에서 방향키로 한 칸 들어온 자리는 남긴다.
    // 방향키가 준 자리는 기호 쪽에 붙어(assoc) 줄 끝·줄 앞 키가 같은 자리로 온 경우와 구분된다.
    const steppedIn = from === outside && assoc === side && !pointer;
    if (outside !== head && !steppedIn) return EditorSelection.cursor(outside, -side, undefined, goalColumn);
  }
  return null;
}

function singleChange(tr: Transaction) {
  const found: (Range & { inserted: Text })[] = [];
  tr.changes.iterChanges((from, to, _fromB, _toB, inserted) => found.push({ from, to, inserted }));
  return found.length === 1 ? found[0] : null;
}

// 기호 안쪽에서 줄을 바꾸면 기호가 다음 줄로 넘어가 서식이 갈라지므로 기호 바깥에서 바꾼다.
function newlineOutsideMarks(tr: Transaction): TransactionSpec | null {
  const state = tr.startState;
  const { head, empty } = state.selection.main;
  const change = singleChange(tr);
  if (!empty || !change || change.from !== head || change.to !== head) return null;
  const { inserted } = change;
  if (inserted.lines < 2 || inserted.toString().trim()) return null;
  const moved = (from: number, caret: number): TransactionSpec => ({
    changes: { from, insert: inserted },
    selection: { anchor: caret },
    scrollIntoView: tr.scrollIntoView,
    userEvent: tr.annotation(Transaction.userEvent),
  });

  // 줄머리 기호 바로 뒤에서 바꾸면 글자만 내려가 빈 제목이 남으므로 줄을 통째로 내린다.
  const prefix = head > 0 ? linePrefix(state, head - 1) : null;
  if (prefix?.to === head && head < state.doc.lineAt(head).to) return moved(prefix.from, head + inserted.length);

  for (const side of [1, -1] as const) {
    const outside = pastMarks(state, head, side, true);
    if (outside !== head) return moved(outside, outside + inserted.length);
  }
  return null;
}

function spanMarks(state: EditorState, node: TreeNode) {
  if (node.name === "Link") return isLinkOpen(state, node) ? null : linkMarks(node);
  const { firstChild: open, lastChild: close } = node;
  return open && close && isHiddenMark(open.name, node.name) ? { open, close } : null;
}

// 지울 범위를 서식 단위로 다듬는다. 글자가 모두 지워지는 서식은 기호까지 지우고, 짝이 남는 기호는 남겨 남은 글자의 서식을 지킨다.
function deletionKeepingPairs(state: EditorState, start: number, end: number) {
  let from = start;
  let to = end;
  const spans: (Range & { open: Range; close: Range })[] = [];
  syntaxTree(state).iterate({
    from,
    to,
    enter({ node }) {
      const marks = spanMarks(state, node);
      if (marks) spans.push({ from: node.from, to: node.to, ...marks });
    },
  });

  const kept: Range[] = [];
  // 안쪽 서식이 통째로 지워지면 바깥 서식의 글자도 다 지워질 수 있어 안쪽부터 본다.
  for (const { from: spanFrom, to: spanTo, open, close } of spans.reverse()) {
    if (from <= open.to && close.from <= to) {
      from = Math.min(from, spanFrom);
      to = Math.max(to, spanTo);
      continue;
    }
    // 기호가 공백에 붙으면 서식을 여닫지 못해 글자로 튀어나오므로, 지운 뒤 기호 옆에 남을 공백까지 지운다.
    if (from <= close.from && close.from <= to) {
      while (from > open.to && !state.sliceDoc(from - 1, from).trim()) from--;
    }
    if (from <= open.to && open.to <= to) {
      while (to < close.from && !state.sliceDoc(to, to + 1).trim()) to++;
    }
    if (from <= open.from && open.to <= to) kept.push(open);
    else if (from <= close.from && close.to <= to) kept.push(close);
  }

  const ranges: Range[] = [];
  let pos = from;
  for (const mark of kept.sort((a, b) => a.from - b.from)) {
    if (pos < mark.from) ranges.push({ from: pos, to: mark.from });
    pos = mark.to;
  }
  if (pos < to) ranges.push({ from: pos, to });
  return ranges;
}

// pos 너머 글자 하나를 지났을 때의 자리. 줄 끝이면 줄바꿈을, 이미지면 문법 전체를 넘는다.
function pastCharacter(state: EditorState, pos: number, side: Side) {
  const line = state.doc.lineAt(pos);
  if (pos === (side < 0 ? line.from : line.to)) return Math.min(Math.max(pos + side, 0), state.doc.length);
  const next = line.from + findClusterBreak(line.text, pos - line.from, side > 0);
  const inner = syntaxTree(state).resolveInner(next);
  for (let node: typeof inner | null = inner; node; node = node.parent) {
    if (node.name === "Image") return side < 0 ? node.from : node.to;
  }
  return next;
}

function visibleDeletion(tr: Transaction): TransactionSpec | null {
  const state = tr.startState;
  const change = singleChange(tr);
  if (!change || change.inserted.length) return null;
  let ranges = deletionKeepingPairs(state, change.from, change.to);

  // 지우기 키가 숨긴 기호만 건드렸으면 사용자가 보는 글자는 그 너머에 있다.
  const side = tr.isUserEvent("delete.backward") ? -1 : tr.isUserEvent("delete.forward") ? 1 : null;
  if (!ranges.length && side) {
    const edge = pastMarks(state, side < 0 ? change.from : change.to, side);
    const next = pastCharacter(state, edge, side);
    ranges = deletionKeepingPairs(state, Math.min(edge, next), Math.max(edge, next));
  }

  const { empty, head, from } = state.selection.main;
  let caret = empty ? head : from;
  const last = ranges.at(-1);
  const prefix = last ? linePrefix(state, last.to) : null;
  const first = last ? state.doc.lineAt(ranges[0].from) : null;
  if (last && first && prefix?.from === last.to && first.to < last.to) {
    // 윗줄에 이어 붙는 줄의 머리 기호는 글자로 드러나므로 같이 지운다. 윗줄이 통째로 지워지면 기호는 남기고 그 뒤에 선다.
    if (first.from === ranges[0].from) caret = prefix.to;
    else last.to = prefix.to;
  } else if (ranges.length === 1 && ranges[0].from === change.from && ranges[0].to === change.to) {
    return null;
  }

  const changes = state.changes(ranges);
  return {
    changes,
    selection: { anchor: changes.mapPos(caret) },
    effects: tr.effects,
    scrollIntoView: tr.scrollIntoView,
    userEvent: tr.annotation(Transaction.userEvent),
  };
}

export const hiddenMarkGuard = EditorState.transactionFilter.of((tr) => {
  if (tr.isUserEvent("select")) {
    if (tr.docChanged || !tr.newSelection.main.empty) return tr;
    const cursor = settledCursor(tr);
    return cursor ? [tr, { selection: EditorSelection.create([cursor]), sequential: true }] : tr;
  }
  if (tr.isUserEvent("delete")) return visibleDeletion(tr) ?? tr;
  // 조합 중인 글자는 DOM이 먼저 바뀌어 있어 트랜잭션을 고치면 조합이 깨진다.
  if (tr.isUserEvent("input") && !tr.isUserEvent("input.type.compose")) return newlineOutsideMarks(tr) ?? tr;
  return tr;
});
