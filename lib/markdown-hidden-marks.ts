import { syntaxTree } from "@codemirror/language";
import {
  EditorSelection,
  EditorState,
  Transaction,
  findClusterBreak,
  type Text,
  type TransactionSpec,
} from "@codemirror/state";

// 작성 칸은 인라인 서식 기호를 늘 숨기므로 기호 안쪽과 바깥쪽이 화면에서 같은 자리로 보인다.
// 그 안쪽에서 줄을 바꾸거나 기호 한쪽만 지우면 서식이 갈라져 남은 기호가 글자로 튀어나온다.
// 키보드·마우스·모바일 입력이 모두 트랜잭션을 거치므로 입력 경로마다 막지 않고 여기서 한 번에 다듬는다.

type Side = -1 | 1;
type Range = { from: number; to: number };

const INLINE_MARKS = new Set(["EmphasisMark", "StrikethroughMark", "HighlightMark", "UnderlineMark"]);

export function isHiddenMark(name: string, parent: string | undefined) {
  return INLINE_MARKS.has(name) || (name === "CodeMark" && parent === "InlineCode");
}

function markBeside(state: EditorState, pos: number, side: Side) {
  const node = syntaxTree(state).resolveInner(pos, side);
  const touches = side > 0 ? node.from === pos : node.to === pos;
  return touches && isHiddenMark(node.name, node.parent?.name) ? node : null;
}

// side 쪽에 붙은 숨긴 기호를 모두 넘은 자리. leavingOnly면 서식을 빠져나가는 기호(오른쪽의 닫는 기호, 왼쪽의 여는 기호)만 넘는다.
function pastMarks(state: EditorState, start: number, side: Side, leavingOnly = false) {
  let pos = start;
  for (let mark = markBeside(state, pos, side); mark; mark = markBeside(state, pos, side)) {
    const leaves = side > 0 ? mark.to === mark.parent?.to : mark.from === mark.parent?.from;
    if (leavingOnly && !leaves) break;
    pos = side > 0 ? mark.to : mark.from;
  }
  return pos;
}

// 사용자가 옮긴 커서가 기호 안쪽에 서면 바깥으로 보낸다. 줄 끝을 눌러도 커서가 닫는 기호 앞에 서기 때문이다.
function settledCursor(tr: Transaction) {
  const state = tr.startState;
  const { head, assoc, goalColumn } = tr.newSelection.main;
  for (const side of [1, -1] as const) {
    const outside = pastMarks(state, head, side, true);
    // 서식 끝에 글을 이어 쓰려면 들어갈 길이 있어야 해서, 바로 바깥에서 방향키로 한 칸 들어온 자리는 남긴다.
    // 방향키가 준 자리는 기호 쪽에 붙어(assoc) 줄 끝·줄 앞 키가 같은 자리로 온 경우와 구분된다.
    const steppedIn =
      state.selection.main.head === outside && assoc === side && !tr.isUserEvent("select.pointer");
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
  for (const side of [1, -1] as const) {
    const outside = pastMarks(state, head, side, true);
    if (outside === head) continue;
    return {
      changes: { from: outside, insert: inserted },
      selection: { anchor: outside + inserted.length },
      scrollIntoView: tr.scrollIntoView,
      userEvent: tr.annotation(Transaction.userEvent),
    };
  }
  return null;
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
      const { firstChild: open, lastChild: close } = node;
      if (open && close && isHiddenMark(open.name, node.name)) spans.push({ from: node.from, to: node.to, open, close });
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
  if (ranges.length === 1 && ranges[0].from === change.from && ranges[0].to === change.to) return null;

  // 지우기 키가 숨긴 기호만 건드렸으면 사용자가 보는 글자는 그 너머에 있다.
  const side = tr.isUserEvent("delete.backward") ? -1 : tr.isUserEvent("delete.forward") ? 1 : null;
  if (!ranges.length && side) {
    const edge = pastMarks(state, side < 0 ? change.from : change.to, side);
    const next = pastCharacter(state, edge, side);
    ranges = deletionKeepingPairs(state, Math.min(edge, next), Math.max(edge, next));
  }

  const changes = state.changes(ranges);
  const { empty, head, from } = state.selection.main;
  return {
    changes,
    selection: { anchor: changes.mapPos(empty ? head : from) },
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
