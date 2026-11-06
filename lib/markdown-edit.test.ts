import { describe, expect, it } from "vitest";
import {
  insertBlock,
  insertLink,
  setHeading,
  toggleInline,
  toggleLinePrefix,
  type TextEdit,
  type TextSelection,
} from "@/lib/markdown-edit";

// "|"는 커서, "[ ]"는 선택 영역을 뜻한다. 예: "가[나다]라"는 "나다"를 선택한 상태.
function sel(marked: string): TextSelection {
  const cursor = marked.indexOf("|");
  if (cursor !== -1) {
    return { value: marked.replace("|", ""), start: cursor, end: cursor };
  }
  const start = marked.indexOf("[");
  const end = marked.indexOf("]") - 1;
  return { value: marked.replace("[", "").replace("]", ""), start, end };
}

function show({ value, start, end }: TextSelection): string {
  if (start === end) return `${value.slice(0, start)}|${value.slice(start)}`;
  return `${value.slice(0, start)}[${value.slice(start, end)}]${value.slice(end)}`;
}

// 에디터는 CodeMirror 트랜잭션으로 반영하므로 결과를 글자로 보려면 여기서 직접 적용한다.
function applyEdit({ value }: TextSelection, edit: TextEdit): TextSelection {
  return {
    value: value.slice(0, edit.from) + edit.insert + value.slice(edit.to),
    start: edit.selectionStart,
    end: edit.selectionEnd,
  };
}

const run = (marked: string, edit: (s: TextSelection) => ReturnType<typeof toggleInline>) =>
  show(applyEdit(sel(marked), edit(sel(marked))));

describe("인라인 문법 토글", () => {
  it("선택한 글자를 문법으로 감싸고 선택을 유지한다", () => {
    expect(run("가[나다]라", (s) => toggleInline(s, "**"))).toBe("가**[나다]**라");
  });

  it("이미 감싼 선택이면 문법을 푼다", () => {
    expect(run("가**[나다]**라", (s) => toggleInline(s, "**"))).toBe("가[나다]라");
    expect(run("가[**나다**]라", (s) => toggleInline(s, "**"))).toBe("가[나다]라");
  });

  it("선택 없이 닫는 기호 바로 앞에서 누르면 기호를 더 넣지 않고 서식 밖으로 나간다", () => {
    expect(run("**나다|**라", (s) => toggleInline(s, "**"))).toBe("**나다**|라");
    expect(run("==나다|==", (s) => toggleInline(s, "=="))).toBe("==나다==|");
    expect(run("`나다|`", (s) => toggleInline(s, "`"))).toBe("`나다`|");
  });

  it("기울임은 굵게 기호의 절반을 닫는 기호로 보지 않는다", () => {
    expect(run("**나다|**", (s) => toggleInline(s, "*"))).toBe("**나다*|***");
  });

  it("선택이 없으면 문법 한 쌍을 넣고 커서를 가운데 둔다", () => {
    expect(run("가|라", (s) => toggleInline(s, "=="))).toBe("가==|==라");
  });

  it("굵게 안에서 기울임을 누르면 굵게를 풀지 않고 기울임을 더한다", () => {
    expect(run("**[나다]**", (s) => toggleInline(s, "*"))).toBe("***[나다]***");
  });
});

describe("줄 단위 문법 토글", () => {
  it("커서가 있는 줄 앞에 글머리를 붙이고 다시 누르면 뗀다", () => {
    expect(run("첫 줄\n둘|째 줄", (s) => toggleLinePrefix(s, "bullet"))).toBe("첫 줄\n- 둘|째 줄");
    expect(run("첫 줄\n- 둘|째 줄", (s) => toggleLinePrefix(s, "bullet"))).toBe("첫 줄\n둘|째 줄");
  });

  it("여러 줄을 선택하면 줄마다 번호를 매기고 빈 줄은 건너뛴다", () => {
    expect(run("[하나\n\n둘\n셋]", (s) => toggleLinePrefix(s, "ordered"))).toBe("[1. 하나\n\n2. 둘\n3. 셋]");
  });

  it("다른 목록 문법은 바꿔 붙인다", () => {
    expect(run("- 하|나", (s) => toggleLinePrefix(s, "ordered"))).toBe("1. 하|나");
  });

  it("다음 줄 맨 앞에서 끝난 선택은 그 줄을 건드리지 않는다", () => {
    expect(run("[인용\n]다음", (s) => toggleLinePrefix(s, "quote"))).toBe("[> 인용]\n다음");
  });
});

describe("제목", () => {
  it("제목 수준을 바꾸고 0이면 본문으로 되돌린다", () => {
    expect(run("제|목", (s) => setHeading(s, 2))).toBe("## 제|목");
    expect(run("## 제|목", (s) => setHeading(s, 1))).toBe("# 제|목");
    expect(run("## 제|목", (s) => setHeading(s, 0))).toBe("제|목");
  });
});

describe("블록 넣기", () => {
  it("구분선은 위아래에 빈 줄을 두어 제목으로 읽히지 않게 한다", () => {
    expect(run("문단|", (s) => insertBlock(s, "rule"))).toBe("문단\n\n---\n|");
    expect(run("|", (s) => insertBlock(s, "rule"))).toBe("---\n|");
  });

  it("코드블록은 선택한 글자를 감싸고 커서를 언어 자리에 둔다", () => {
    expect(run("앞\n[const a = 1;]\n뒤", (s) => insertBlock(s, "code"))).toBe(
      "앞\n\n```|\nconst a = 1;\n```\n\n뒤",
    );
  });
});

describe("링크", () => {
  it("선택한 글자를 링크 이름으로 쓰고 주소 자리를 선택한다", () => {
    expect(run("[블로그]", (s) => insertLink(s))).toBe("[블로그]([https://])");
  });

  it("선택한 글자가 주소면 주소로 쓰고 커서를 이름 자리에 둔다", () => {
    expect(run("[https://example.com]", (s) => insertLink(s))).toBe("[|](https://example.com)");
  });
});
