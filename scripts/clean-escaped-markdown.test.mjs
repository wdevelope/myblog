import { describe, expect, it } from "vitest";
import { cleanContent, literalStars, restorePairs, restoreSource } from "./clean-escaped-markdown.mjs";

describe("통째로 붙여 넣은 마크다운 원문 되살리기", () => {
  it("붙여 넣을 때 씌워진 굵게를 걷고 제목·구분선 기호의 이스케이프를 푼다", () => {
    expect(restoreSource("**\\## 1.** 🚨 **문제 상황 (The Problem)**\n\n\\---")).toBe(
      "## 1. 🚨 문제 상황 (The Problem)\n\n---",
    );
  });

  it("원문의 굵게·인라인 코드·목록 기호를 서식으로 되돌린다", () => {
    expect(restoreSource("**기존 로직은 \\*\\*동기식(Synchronous)\\*\\* 구조입니다.**")).toBe(
      "기존 로직은 **동기식(Synchronous)** 구조입니다.",
    );
    expect(restoreSource("**2\\. \\*\\*이력을 \\`insertMany\\`로 저장 (동기 대기)\\*\\***")).toBe(
      "2. **이력을 `insertMany`로 저장 (동기 대기)**",
    );
    expect(restoreSource("   **- 응답 \\`SmsBatch\\` 문서**\n**\\* \\*\\*장점:\\*\\* 빠름**")).toBe(
      "   - 응답 `SmsBatch` 문서\n* **장점:** 빠름",
    );
  });

  it("수식을 막으려고 넣은 `\\$` 이스케이프는 남긴다", () => {
    expect(restoreSource("**가격 \\$10**")).toBe("가격 \\$10");
  });

  it("이미 정리한 글을 다시 돌려도 되살린 굵게를 걷지 않는다", () => {
    const cleaned = cleanContent("**기존 \\*\\*동기식\\*\\* 구조**", "source");
    expect(cleaned).toBe("기존 **동기식** 구조");
    expect(cleanContent(cleaned, "source")).toBe(cleaned);
  });
});

describe("글자로 남은 굵게·기울임 짝 되살리기", () => {
  it("한 줄 안에서 짝이 맞는 `\\*\\*`·`\\*`만 서식으로 되돌린다", () => {
    expect(restorePairs("선별하여 \\*\\*'임팩트 있는 지원'\\*\\*에 집중")).toBe("선별하여 **'임팩트 있는 지원'**에 집중");
    expect(restorePairs("\\*부모의 유전 정보\\*나 **이미 굵게**")).toBe("*부모의 유전 정보*나 **이미 굵게**");
  });

  it("줄머리에 글자로 쓴 짝 없는 `\\*`는 그대로 둔다", () => {
    const source = "\\*종합비타민\n\n\\*칼마디 (칼슘, 마그네슘)";
    expect(restorePairs(source)).toBe(source);
  });
});

describe("글 화면에 글자로 남는 별표 세기", () => {
  it("서식이 되지 못한 `*`만 세고 인라인 코드 안은 세지 않는다", () => {
    expect(literalStars('\\*\\*"중요"\\*\\*는')).toBe(4);
    expect(literalStars('**"중요"**는 `a*b`')).toBe(0);
  });
});
