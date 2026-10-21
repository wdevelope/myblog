import { describe, expect, it } from "vitest";
import { toAutoTitle, toExcerpt } from "@/lib/markdown";

describe("본문 요약", () => {
  it("POST-5 HTML 태그를 지우고 연속 공백을 하나로 줄인다", () => {
    expect(toExcerpt("<p>안녕   하세요</p>\n<p><strong>반가워요</strong></p>")).toBe(
      "안녕 하세요 반가워요",
    );
  });

  it("POST-5 최대 길이를 넘으면 단어 경계에서 자르고 말줄임표를 붙인다", () => {
    expect(toExcerpt("하나 둘 셋 넷", 6)).toBe("하나 둘…");
  });

  it("POST-5 빈 본문이나 태그만 있는 본문은 빈 문자열이다", () => {
    expect(toExcerpt("")).toBe("");
    expect(toExcerpt("<p></p>")).toBe("");
  });
});

describe("피드 자동 제목", () => {
  it("POST-4 본문 앞부분을 48자 안에서 말줄임표 없이 제목으로 쓴다", () => {
    const content = `<p>${"가나다 ".repeat(20)}</p>`;
    const title = toAutoTitle(content);
    expect(title.length).toBeLessThanOrEqual(48);
    expect(title.endsWith("…")).toBe(false);
    expect(title.startsWith("가나다 가나다")).toBe(true);
  });

  it("POST-4 남는 글자가 없으면 제목은 '피드'다", () => {
    expect(toAutoTitle("<p> </p>")).toBe("피드");
  });
});
