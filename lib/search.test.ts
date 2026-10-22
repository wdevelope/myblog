import { describe, expect, it } from "vitest";
import { buildSearchFilter, normalizeSearchQuery, SEARCH_QUERY_MAX_LENGTH } from "@/lib/search";

// PostgREST가 or=(...)를 읽는 방식대로 조건을 나눈다: 큰따옴표 값 안에서 \x는 x다.
function parseOrFilter(filter: string) {
  expect(filter.startsWith("(") && filter.endsWith(")")).toBe(true);
  const body = filter.slice(1, -1);
  const conditions: { column: string; operator: string; value: string }[] = [];
  let index = 0;
  while (index < body.length) {
    const head = /^(\w+)\.(\w+)\."/.exec(body.slice(index));
    if (!head) throw new Error(`조건을 읽을 수 없다: ${body.slice(index)}`);
    index += head[0].length;
    let value = "";
    while (body[index] !== '"') {
      if (index >= body.length) throw new Error("닫는 따옴표가 없다");
      if (body[index] === "\\") index += 1;
      value += body[index];
      index += 1;
    }
    index += 1;
    conditions.push({ column: head[1], operator: head[2], value });
    if (index < body.length) {
      expect(body[index]).toBe(",");
      index += 1;
    }
  }
  return conditions;
}

describe("검색어 정리", () => {
  it("앞뒤 공백을 지우고 안쪽 공백·줄바꿈·제어 문자를 공백 하나로 접는다", () => {
    expect(normalizeSearchQuery("  리액트\n\t훅\u0000  정리  ")).toBe("리액트 훅 정리");
  });

  it("값이 없거나 공백뿐이면 빈 문자열이다", () => {
    expect(normalizeSearchQuery(undefined)).toBe("");
    expect(normalizeSearchQuery("")).toBe("");
    expect(normalizeSearchQuery(" \n\t ")).toBe("");
    expect(normalizeSearchQuery([])).toBe("");
  });

  it("여러 번 온 값은 첫 값만 쓴다", () => {
    expect(normalizeSearchQuery([" 첫째 ", "둘째"])).toBe("첫째");
  });

  it(`${SEARCH_QUERY_MAX_LENGTH}자로 자르고 잘린 끝의 공백은 지운다`, () => {
    expect(normalizeSearchQuery("가".repeat(60))).toBe("가".repeat(50));
    expect(normalizeSearchQuery(`${"가".repeat(49)} 나다`)).toBe("가".repeat(49));
  });

  it("이모지 같은 서로게이트 쌍을 반으로 가르지 않는다", () => {
    const result = normalizeSearchQuery("😀".repeat(60));
    expect(Array.from(result)).toHaveLength(50);
    expect(result).toBe("😀".repeat(50));
  });
});

describe("검색 필터 만들기", () => {
  it("제목 또는 본문을 대소문자 없이 부분 일치로 찾는 or 조건을 만든다", () => {
    expect(buildSearchFilter("리액트")).toBe('(title.imatch."리액트",content.imatch."리액트")');
  });

  it("정규식·PostgREST 문법 문자를 \\로 막아 따옴표 안에 넣는다", () => {
    expect(buildSearchFilter("a,b")).toBe(String.raw`(title.imatch."a\\,b",content.imatch."a\\,b")`);
    expect(buildSearchFilter('a"b')).toBe(String.raw`(title.imatch."a\\\"b",content.imatch."a\\\"b")`);
    expect(buildSearchFilter("a\\b")).toBe(String.raw`(title.imatch."a\\\\b",content.imatch."a\\\\b")`);
  });

  it("검색어로 따옴표를 닫아 조건을 끼워 넣을 수 없다", () => {
    const attack = 'x",visibility.eq.private,title.imatch."y';

    const conditions = parseOrFilter(buildSearchFilter(attack));

    expect(conditions.map(({ column, operator }) => `${column}.${operator}`)).toEqual([
      "title.imatch",
      "content.imatch",
    ]);
  });

  it.each([
    ["쉼표", "공개,글"],
    ["괄호", "(공개)"],
    ["따옴표", '"안녕"'],
    ["백슬래시", String.raw`\frac{1}{3}`],
    ["별표", "**굵게**"],
    ["퍼센트", "100%"],
    ["밑줄", "snake_case"],
    ["정규식 기호", "a.b+c?^$|[x]"],
    ["마침표·콜론", "https://example.com"],
  ])("%s 포함: 그 글자 그대로만 찾는다", (_, query) => {
    const [title, content] = parseOrFilter(buildSearchFilter(query));
    expect(title.value).toBe(content.value);

    const pattern = new RegExp(title.value, "i");
    expect(pattern.test(`앞 ${query} 뒤`)).toBe(true);
    // 기호를 다른 글자로 바꾼 문장에는 맞지 않는다(와일드카드로 쓰이지 않는다).
    expect(pattern.test(query.replace(/[^\p{L}\p{N}]/gu, "X"))).toBe(false);
  });
});
