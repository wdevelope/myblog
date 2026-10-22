import { describe, expect, it } from "vitest";
import { blogMarkdownParser } from "@/lib/markdown-syntax";

// 노드 이름과 그 노드가 덮는 글자를 순서대로 모은다.
function nodes(source: string, names: string[]) {
  const found: string[] = [];
  blogMarkdownParser.parse(source).iterate({
    enter(node) {
      if (names.includes(node.name)) found.push(`${node.name}:${source.slice(node.from, node.to)}`);
    },
  });
  return found;
}

describe("작성 칸 마크다운 파서", () => {
  it("`==`는 형광펜, `++`는 밑줄로 읽는다", () => {
    expect(nodes("==중요== 와 ++밑줄++", ["Highlight", "Underline"])).toEqual([
      "Highlight:==중요==",
      "Underline:++밑줄++",
    ]);
    expect(nodes("==중요==", ["HighlightMark"])).toEqual(["HighlightMark:==", "HighlightMark:=="]);
  });

  it("짝이 없거나 앞뒤가 띄어진 `==`·`++`는 글자로 남는다", () => {
    expect(nodes("a == b", ["Highlight"])).toEqual([]);
    expect(nodes("C++ and C++", ["Underline"])).toEqual([]);
  });

  it("인라인 코드 안의 `==`는 서식이 아니다", () => {
    expect(nodes("`==x==`", ["Highlight", "InlineCode"])).toEqual(["InlineCode:`==x==`"]);
  });

  it("`$…$`는 인라인 수식으로 읽는다", () => {
    expect(nodes("값은 $x^2$ 이다", ["InlineMath"])).toEqual(["InlineMath:$x^2$"]);
  });

  it("짝이 없거나 숫자에 붙은 `$`는 글자로 남는다", () => {
    expect(nodes("가격 $5", ["InlineMath"])).toEqual([]);
    expect(nodes("앞 $$ 뒤", ["InlineMath"])).toEqual([]);
    expect(nodes("$5와 $6", ["InlineMath"])).toEqual([]);
  });

  it("이스케이프한 `\\$`는 수식을 열거나 닫지 않는다", () => {
    expect(nodes("\\$x$", ["InlineMath"])).toEqual([]);
    expect(nodes("$a\\$b$", ["InlineMath"])).toEqual(["InlineMath:$a\\$b$"]);
  });

  it("문단 안의 `$$…$$`도 수식으로 읽는다", () => {
    expect(nodes("앞 $$x$$ 뒤", ["InlineMath"])).toEqual(["InlineMath:$$x$$"]);
  });

  it("`$$` 줄로 시작하는 블록 수식은 닫는 `$$` 줄까지다", () => {
    expect(nodes("$$\na+b\n$$\n\n뒤", ["BlockMath"])).toEqual(["BlockMath:$$\na+b\n$$"]);
    expect(nodes("$$x$$", ["BlockMath"])).toEqual(["BlockMath:$$x$$"]);
  });

  it("블록 수식은 문단 중간에서도 시작한다", () => {
    expect(nodes("문단\n$$\nx\n$$", ["BlockMath", "Paragraph"])).toEqual([
      "Paragraph:문단",
      "BlockMath:$$\nx\n$$",
    ]);
  });

  it("인용 안의 블록 수식은 인용이 끝나면 함께 끝난다", () => {
    expect(nodes("> $$\n> x\n\n뒤", ["BlockMath", "Paragraph"])).toEqual([
      "BlockMath:$$\n> x",
      "Paragraph:뒤",
    ]);
  });

  it("닫는 `$$`가 없으면 글 끝까지 블록 수식이다", () => {
    expect(nodes("$$\nx\ny", ["BlockMath"])).toEqual(["BlockMath:$$\nx\ny"]);
  });

  it("GFM 취소선과 표를 읽는다", () => {
    expect(nodes("~~취소~~", ["Strikethrough"])).toEqual(["Strikethrough:~~취소~~"]);
    expect(nodes("| a |\n| - |\n| b |", ["Table"])).toHaveLength(1);
  });
});
