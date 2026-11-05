// @vitest-environment jsdom
import {
  cursorCharLeft,
  cursorCharRight,
  deleteCharBackward,
  deleteCharForward,
  deleteGroupBackward,
  deleteLineBoundaryBackward,
  history,
  insertNewlineAndIndent,
  undo,
} from "@codemirror/commands";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import { markdownLivePreview } from "@/lib/markdown-live-preview";

const views: EditorView[] = [];

afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
});

// `‸`는 커서, `«`…`»`는 선택 영역이다.
function open(source: string) {
  const anchor = source.search(/[‸«]/);
  const head = source.includes("»") ? source.indexOf("»") - 1 : anchor;
  const view = new EditorView({
    state: EditorState.create({
      doc: source.replace(/[‸«»]/g, ""),
      selection: EditorSelection.range(anchor, head),
      extensions: [history(), markdownLivePreview],
    }),
    parent: document.body,
  });
  views.push(view);
  return view;
}

function shown(view: EditorView) {
  const doc = view.state.doc.toString();
  const { from, to } = view.state.selection.main;
  if (from === to) return `${doc.slice(0, from)}‸${doc.slice(from)}`;
  return `${doc.slice(0, from)}«${doc.slice(from, to)}»${doc.slice(to)}`;
}

// 누르기·End·Home·위아래 이동은 레이아웃이 있어야 나오므로, 그 결과인 트랜잭션을 그대로 만든다.
function click(view: EditorView, pos: number) {
  view.dispatch({ selection: EditorSelection.cursor(pos, 1), userEvent: "select.pointer" });
}

// 줄 끝으로 가는 키는 글자 왼쪽에 붙은 자리(assoc -1), 줄 앞으로 가는 키는 오른쪽에 붙은 자리(assoc 1)를 준다.
function moveTo(view: EditorView, pos: number, assoc: -1 | 1) {
  view.dispatch({ selection: EditorSelection.cursor(pos, assoc), userEvent: "select" });
}

describe("숨긴 서식 기호와 커서", () => {
  it.each([
    ["끝 **굵게**", 6, 8],
    ["끝 *기울임*", 6, 7],
    ["끝 ~~취소~~", 6, 8],
    ["끝 ++밑줄++", 6, 8],
    ["끝 ==형광펜==", 7, 9],
    ["끝 `코드`", 5, 6],
  ])("%s의 줄 끝을 누르면 닫는 기호 뒤에 선다", (doc, inner, outer) => {
    const view = open(`‸${doc}`);
    click(view, inner);
    expect(view.state.selection.main.head).toBe(outer);
  });

  it("서식으로 시작하는 줄의 맨 앞을 누르면 여는 기호 앞에 선다", () => {
    const view = open("앞\n‸\n**굵게** 뒤");
    click(view, 5);
    expect(shown(view)).toBe("앞\n\n‸**굵게** 뒤");
  });

  it("줄 끝으로 가는 키는 닫는 기호 뒤에 멈춘다", () => {
    const view = open("끝 **굵‸게**");
    moveTo(view, 6, -1);
    expect(shown(view)).toBe("끝 **굵게**‸");
  });

  it("이미 줄 끝에 있을 때 줄 끝으로 가는 키를 다시 눌러도 기호 안으로 들어가지 않는다", () => {
    const view = open("끝 **굵게**‸");
    moveTo(view, 6, -1);
    expect(shown(view)).toBe("끝 **굵게**‸");
  });

  it("줄 앞으로 가는 키는 여는 기호 앞에 멈춘다", () => {
    const view = open("**굵‸게** 뒤");
    moveTo(view, 2, 1);
    expect(shown(view)).toBe("‸**굵게** 뒤");
  });

  it("이미 줄 앞에 있을 때 줄 앞으로 가는 키를 다시 눌러도 기호 안으로 들어가지 않는다", () => {
    const view = open("‸**굵게** 뒤");
    moveTo(view, 2, 1);
    expect(shown(view)).toBe("‸**굵게** 뒤");
  });

  it("다른 줄에서 위아래로 와도 닫는 기호 뒤에 선다", () => {
    const view = open("끝 **굵게**\n둘째 줄‸");
    moveTo(view, 6, 1);
    expect(shown(view)).toBe("끝 **굵게**‸\n둘째 줄");
  });

  it("방향키로 서식 끝을 지나면 닫는 기호 뒤로 나간다", () => {
    const view = open("**굵‸게** 뒤");
    cursorCharRight(view);
    expect(shown(view)).toBe("**굵게**‸ 뒤");
  });

  it("방향키로 서식 앞을 지나면 여는 기호 앞으로 나간다", () => {
    const view = open("앞 **굵‸게**");
    cursorCharLeft(view);
    expect(shown(view)).toBe("앞 ‸**굵게**");
  });

  it("바깥에서 방향키로 한 칸 들어오면 서식 안쪽 끝에 머문다", () => {
    const fromRight = open("**굵게**‸ 뒤");
    cursorCharLeft(fromRight);
    expect(shown(fromRight)).toBe("**굵게‸** 뒤");

    const fromLeft = open("앞 ‸**굵게**");
    cursorCharRight(fromLeft);
    expect(shown(fromLeft)).toBe("앞 **‸굵게**");
  });

  it("한 글자짜리 기호도 방향키로 한 칸 들어오면 안쪽 끝에 머문다", () => {
    const view = open("*기울임*‸ 뒤");
    cursorCharLeft(view);
    expect(shown(view)).toBe("*기울임‸* 뒤");
  });

  it("겹친 서식의 기호는 한 번에 넘는다", () => {
    const view = open("‸***굵게***");
    click(view, 5);
    expect(shown(view)).toBe("***굵게***‸");
  });

  it("선택 영역과 프로그램이 옮긴 커서는 건드리지 않는다", () => {
    const view = open("**‸굵게**");
    view.dispatch({ selection: EditorSelection.range(2, 4), userEvent: "select.pointer" });
    expect(shown(view)).toBe("**«굵게»**");
    view.dispatch({ selection: EditorSelection.cursor(4) });
    expect(shown(view)).toBe("**굵게‸**");
  });

  it("코드블록 펜스와 짝이 없는 기호는 숨긴 기호가 아니다", () => {
    const fence = open("‸```\n코드\n```");
    click(fence, 3);
    expect(shown(fence)).toBe("```‸\n코드\n```");

    const unpaired = open("‸**굵게");
    click(unpaired, 2);
    expect(shown(unpaired)).toBe("**‸굵게");
  });
});

describe("줄머리 기호와 커서", () => {
  it.each([
    ["## 제목", 3],
    ["> 인용", 2],
    ["- 항목", 2],
    ["> ## 제목", 5],
  ])("%s의 줄 맨 앞을 누르면 기호 뒤에 선다", (line, inner) => {
    const view = open(`앞‸\n\n${line}`);
    click(view, 3);
    expect(view.state.selection.main.head).toBe(3 + inner);
  });

  it("윗줄 끝에서 오른쪽 방향키를 누르면 기호 뒤로 들어간다", () => {
    const view = open("앞‸\n## 제목");
    cursorCharRight(view);
    expect(shown(view)).toBe("앞\n## ‸제목");
  });

  it.each(["## ", "> ", "- ", "> ## "])("%s 뒤에서 왼쪽 방향키를 누르면 윗줄 끝으로 간다", (mark) => {
    const view = open(`앞\n${mark}‸글자`);
    cursorCharLeft(view);
    expect(shown(view)).toBe(`앞‸\n${mark}글자`);
  });

  it("첫 줄의 기호 뒤에서 왼쪽 방향키를 눌러도 기호 앞으로 가지 않는다", () => {
    const view = open("## ‸제목");
    cursorCharLeft(view);
    expect(shown(view)).toBe("## ‸제목");
  });

  it("줄 앞으로 가는 키를 눌러도 기호 앞으로 가지 않고 윗줄로도 넘어가지 않는다", () => {
    const view = open("앞\n## ‸제목");
    moveTo(view, 2, -1);
    expect(shown(view)).toBe("앞\n## ‸제목");
  });

  it("공백 없이 막 친 기호는 보통 글자처럼 커서가 앞에 설 수 있다", () => {
    const view = open("#‸");
    click(view, 0);
    expect(shown(view)).toBe("‸#");
  });

  it("번호 목록과 체크리스트 기호도 숨기므로 앞에 서지 않는다", () => {
    const ordered = open("1. 하나‸");
    click(ordered, 0);
    expect(shown(ordered)).toBe("1. ‸하나");

    const task = open("- [ ] 하나‸");
    click(task, 0);
    expect(shown(task)).toBe("- ‸[ ] 하나");
  });

  it("기호 뒤 공백이 여럿이어도 공백 사이에 서지 않는다", () => {
    const view = open("-   하나‸");
    click(view, 2);
    expect(shown(view)).toBe("-   ‸하나");
  });

  it("들여쓴 목록은 줄 앞 공백 앞에도 서지 않는다", () => {
    const view = open("- 하나\n  - 둘‸");
    click(view, 5);
    expect(shown(view)).toBe("- 하나\n  - ‸둘");
    click(view, 6);
    expect(shown(view)).toBe("- 하나\n  - ‸둘");
  });

  it("줄 앞으로 가는 키가 이스케이프 안쪽에 서면 이스케이프 앞으로 옮긴다", () => {
    const view = open("\\*가‸");
    moveTo(view, 1, 1);
    expect(shown(view)).toBe("‸\\*가");
  });
});

describe("링크 기호와 커서", () => {
  const url = "https://a.com";

  it("링크로 끝나는 줄의 끝을 누르면 주소 뒤에 선다", () => {
    const view = open(`‸끝 [글자](${url})`);
    click(view, 5);
    expect(shown(view)).toBe(`끝 [글자](${url})‸`);
  });

  it("줄 끝으로 가는 키도 주소 뒤에 멈춘다", () => {
    const view = open(`끝‸ [글자](${url})`);
    moveTo(view, 5, -1);
    expect(shown(view)).toBe(`끝 [글자](${url})‸`);
  });

  it("링크 글자 앞을 누르면 여는 괄호 앞에 선다", () => {
    const view = open(`앞‸ [글자](${url})`);
    click(view, 3);
    expect(shown(view)).toBe(`앞 ‸[글자](${url})`);
  });

  it("링크 글자 가운데를 누르면 그 자리에 선다", () => {
    const view = open(`앞‸ [글자](${url})`);
    click(view, 4);
    expect(shown(view)).toBe(`앞 [글‸자](${url})`);
  });

  it("바깥에서 방향키로 한 칸 들어오면 링크 안쪽 끝에 머문다", () => {
    const fromRight = open(`[글자](${url})‸ 뒤`);
    cursorCharLeft(fromRight);
    expect(shown(fromRight)).toBe(`[글자‸](${url}) 뒤`);

    const fromLeft = open(`앞 ‸[글자](${url})`);
    cursorCharRight(fromLeft);
    expect(shown(fromLeft)).toBe(`앞 [‸글자](${url})`);
  });

  it("커서가 링크 안에 있으면 주소까지 한 글자씩 움직인다", () => {
    const view = open(`[글‸자](${url})`);
    cursorCharRight(view);
    expect(shown(view)).toBe(`[글자‸](${url})`);
    cursorCharRight(view);
    expect(shown(view)).toBe(`[글자]‸(${url})`);
    cursorCharRight(view);
    expect(shown(view)).toBe(`[글자](‸${url})`);
  });

  it("주소가 없는 대괄호는 링크가 아니라 커서를 옮기지 않는다", () => {
    const view = open("‸[공지] 안내");
    click(view, 1);
    expect(shown(view)).toBe("[‸공지] 안내");
  });
});

describe("숨긴 서식 기호와 Enter", () => {
  it("닫는 기호 앞에서 줄을 바꾸면 기호 뒤에서 바뀐다", () => {
    const view = open("끝 **굵게‸**\n다음");
    insertNewlineAndIndent(view);
    expect(shown(view)).toBe("끝 **굵게**\n‸\n다음");
  });

  it("여는 기호 뒤에서 줄을 바꾸면 기호 앞에서 바뀐다", () => {
    const view = open("앞 **‸굵게**");
    insertNewlineAndIndent(view);
    expect(shown(view)).toBe("앞 \n‸**굵게**");
  });

  it("인라인 코드 끝에서 줄을 바꿔도 서식이 갈라지지 않는다", () => {
    const view = open("끝 `코드‸`");
    insertNewlineAndIndent(view);
    expect(shown(view)).toBe("끝 `코드`\n‸");
  });

  it("서식 가운데서 줄을 바꾸면 그 자리에서 바뀐다", () => {
    const view = open("**굵‸게**");
    insertNewlineAndIndent(view);
    expect(shown(view)).toBe("**굵\n‸게**");
  });

  it("줄바꿈이 아닌 입력은 서식 안쪽 끝에 그대로 들어간다", () => {
    const view = open("**굵게‸**");
    view.dispatch({ changes: { from: 4, insert: "요" }, selection: { anchor: 5 }, userEvent: "input.type" });
    expect(shown(view)).toBe("**굵게요‸**");
  });

  it("되돌리면 한 번에 원래 글로 돌아간다", () => {
    const view = open("끝 **굵게‸**");
    insertNewlineAndIndent(view);
    undo(view);
    expect(view.state.doc.toString()).toBe("끝 **굵게**");
  });
});

describe("줄머리 기호와 Enter", () => {
  it.each(["## ", "> ", "- "])("%s 바로 뒤에서 줄을 바꾸면 그 줄이 통째로 아래로 내려간다", (mark) => {
    const view = open(`${mark}‸글자`);
    insertNewlineAndIndent(view);
    expect(shown(view)).toBe(`\n${mark}‸글자`);
  });

  it("글자가 없는 줄머리에서 줄을 바꾸면 다음 줄로 나간다", () => {
    const view = open("## ‸");
    insertNewlineAndIndent(view);
    expect(shown(view)).toBe("## \n‸");
  });

  it("글자 뒤에서 줄을 바꾸면 그 자리에서 바뀐다", () => {
    const view = open("## 제‸목");
    insertNewlineAndIndent(view);
    expect(shown(view)).toBe("## 제\n‸목");
  });
});

describe("숨긴 서식 기호와 지우기", () => {
  it("닫는 기호 바로 뒤에서 지우면 기호 대신 보이는 글자를 지운다", () => {
    const view = open("**굵게**‸ 뒤");
    deleteCharBackward(view);
    expect(shown(view)).toBe("**굵**‸ 뒤");
  });

  it("여는 기호 바로 앞에서 앞으로 지우면 보이는 글자를 지운다", () => {
    const view = open("앞 ‸**굵게**");
    deleteCharForward(view);
    expect(shown(view)).toBe("앞 ‸**게**");
  });

  it("서식 안쪽 끝에서 바깥쪽으로 지우면 기호 너머의 글자를 지운다", () => {
    const backward = open("앞 **‸굵게**");
    deleteCharBackward(backward);
    expect(shown(backward)).toBe("앞**‸굵게**");

    const forward = open("**굵게‸** 뒤");
    deleteCharForward(forward);
    expect(shown(forward)).toBe("**굵게‸**뒤");
  });

  it("마지막 글자를 지우면 서식 기호도 함께 지운다", () => {
    const view = open("앞 **게**‸ 뒤");
    deleteCharBackward(view);
    expect(shown(view)).toBe("앞 ‸ 뒤");
  });

  it("겹친 서식의 마지막 글자를 지우면 기호를 모두 지운다", () => {
    const view = open("**==게==**‸");
    deleteCharBackward(view);
    expect(shown(view)).toBe("‸");
  });

  it("줄 첫 서식의 여는 기호 뒤에서 지우면 윗줄과 합친다", () => {
    const view = open("윗줄\n**‸굵게**");
    deleteCharBackward(view);
    expect(shown(view)).toBe("윗줄**‸굵게**");
  });

  it("글 맨 앞 서식의 여는 기호 뒤에서 지우면 아무것도 지우지 않는다", () => {
    const view = open("**‸굵게**");
    deleteCharBackward(view);
    expect(shown(view)).toBe("**‸굵게**");
  });

  it("서식 바로 뒤에서 단어를 지워도 기호가 튀어나오지 않는다", () => {
    const view = open("**굵게**‸");
    deleteGroupBackward(view);
    expect(shown(view)).toBe("**굵**‸");
  });

  it("서식 가운데서 줄 앞까지 지우면 남은 글자의 서식이 유지된다", () => {
    const view = open("**굵‸게** 뒤");
    deleteLineBoundaryBackward(view);
    expect(shown(view)).toBe("**‸게** 뒤");
  });

  it("앞에서 서식 가운데까지 선택해 지우면 남은 글자의 서식이 유지된다", () => {
    const view = open("«앞 **굵»게** 뒤");
    deleteCharBackward(view);
    expect(shown(view)).toBe("‸**게** 뒤");
  });

  it("서식 가운데서 뒤까지 선택해 지우면 남은 글자의 서식이 유지된다", () => {
    const view = open("앞 **굵«게** 뒤»");
    deleteCharBackward(view);
    expect(shown(view)).toBe("앞 **굵‸**");
  });

  it("서식 글자를 모두 덮는 선택을 지우면 기호도 남기지 않는다", () => {
    const view = open("앞 **«굵게** 뒤»");
    deleteCharBackward(view);
    expect(shown(view)).toBe("앞 ‸");
  });

  it("지운 뒤 서식 끝에 공백이 남으면 공백도 함께 지운다", () => {
    const outside = open("**안녕 세**‸ 뒤");
    deleteCharBackward(outside);
    expect(shown(outside)).toBe("**안녕**‸ 뒤");

    const inside = open("**안녕 세‸** 뒤");
    deleteCharBackward(inside);
    expect(shown(inside)).toBe("**안녕‸** 뒤");
  });

  it("지운 뒤 서식 앞에 공백이 남으면 공백도 함께 지운다", () => {
    const view = open("앞 ‸**세 안녕**");
    deleteCharForward(view);
    expect(shown(view)).toBe("앞 ‸**안녕**");
  });

  it("선택해 지운 뒤 서식 끝에 공백이 남으면 공백도 함께 지운다", () => {
    const view = open("**안녕 «세상»**");
    deleteCharBackward(view);
    expect(shown(view)).toBe("**안녕‸**");
  });

  it("서식 바깥의 공백은 함께 지우지 않는다", () => {
    const view = open("앞 ‸뒤 **굵게**");
    deleteCharForward(view);
    expect(shown(view)).toBe("앞 ‸ **굵게**");
  });

  it("서식이 없는 글자를 지울 때는 그대로 둔다", () => {
    const view = open("앞 뒤‸ **굵게**");
    deleteCharBackward(view);
    expect(shown(view)).toBe("앞 ‸ **굵게**");
  });

  it("지운 글자는 되돌리기 한 번에 돌아온다", () => {
    const view = open("**굵게**‸");
    deleteCharBackward(view);
    undo(view);
    expect(view.state.doc.toString()).toBe("**굵게**");
  });

  it("서식 안에 이미지만 있으면 이미지를 통째로 지운다", () => {
    const view = open("**![](https://example.com/a.png)**‸");
    deleteCharBackward(view);
    expect(shown(view)).toBe("‸");
  });
});

describe("줄머리 기호와 지우기", () => {
  it.each(["## ", "> ", "- "])("%s 바로 뒤에서 지우면 기호만 지워 보통 줄이 된다", (mark) => {
    const view = open(`앞\n${mark}‸글자`);
    deleteCharBackward(view);
    expect(shown(view)).toBe("앞\n‸글자");
  });

  it.each(["## ", "> ", "- "])("윗줄 끝에서 앞으로 지우면 %s 없이 글자만 붙는다", (mark) => {
    const view = open(`앞‸\n${mark}글자`);
    deleteCharForward(view);
    expect(shown(view)).toBe("앞‸글자");
  });

  it("빈 줄을 앞으로 지우면 아랫줄의 기호를 남기고 기호 뒤에 선다", () => {
    const view = open("앞\n‸\n## 제목");
    deleteCharForward(view);
    expect(shown(view)).toBe("앞\n## ‸제목");
  });

  it("윗줄을 통째로 선택해 지우면 아랫줄의 기호를 남긴다", () => {
    const view = open("«앞\n»## 제목");
    deleteCharBackward(view);
    expect(shown(view)).toBe("## ‸제목");
  });

  it("줄을 넘어 제목 가운데까지 선택해 지우면 기호도 함께 지워진다", () => {
    const view = open("앞«\n## 제»목");
    deleteCharBackward(view);
    expect(shown(view)).toBe("앞‸목");
  });

  it("구분선은 한 번에 지운다", () => {
    const view = open("앞\n\n---‸\n\n뒤");
    deleteCharBackward(view);
    expect(shown(view)).toBe("앞\n\n‸\n\n뒤");
  });

  it("이스케이프한 글자는 백슬래시까지 함께 지운다", () => {
    const view = open("1\\.‸ 제목");
    deleteCharBackward(view);
    expect(shown(view)).toBe("1‸ 제목");
  });
});

describe("링크 기호와 지우기", () => {
  const url = "https://a.com";

  it("링크 바로 뒤에서 지우면 주소 대신 보이는 글자를 지운다", () => {
    const view = open(`[글자](${url})‸ 뒤`);
    deleteCharBackward(view);
    expect(shown(view)).toBe(`[글](${url})‸ 뒤`);
  });

  it("마지막 글자를 지우면 주소까지 함께 지운다", () => {
    const view = open(`앞 [글](${url})‸ 뒤`);
    deleteCharBackward(view);
    expect(shown(view)).toBe("앞 ‸ 뒤");
  });

  it("링크 바로 앞에서 앞으로 지우면 보이는 글자를 지운다", () => {
    const view = open(`앞 ‸[글자](${url})`);
    deleteCharForward(view);
    expect(shown(view)).toBe(`앞 ‸[자](${url})`);
  });

  it("앞에서 링크 가운데까지 선택해 지우면 남은 글자는 링크로 남는다", () => {
    const view = open(`«앞 [글»자](${url})`);
    deleteCharBackward(view);
    expect(shown(view)).toBe(`‸[자](${url})`);
  });

  it("링크 글자를 모두 덮는 선택을 지우면 주소도 남기지 않는다", () => {
    const view = open(`앞 [«글자](${url}) 뒤»`);
    deleteCharBackward(view);
    expect(shown(view)).toBe("앞 ‸");
  });

  it("커서가 링크 안에 있으면 주소를 원문대로 한 글자씩 지운다", () => {
    const view = open(`[글자](https://a.c‸om)`);
    deleteCharBackward(view);
    expect(shown(view)).toBe("[글자](https://a.‸om)");
  });
});
