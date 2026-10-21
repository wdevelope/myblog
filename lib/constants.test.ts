import { describe, expect, it } from "vitest";
import { articleListHref, postHref } from "@/lib/constants";

describe("postHref", () => {
  it("blog 타입은 화면 이름인 /article 경로를 쓴다", () => {
    expect(postHref("blog")).toBe("/article");
    expect(postHref("blog", "hello")).toBe("/article/hello");
  });

  it("diary는 목록과 상세 경로를 돌려준다", () => {
    expect(postHref("diary")).toBe("/diary");
    expect(postHref("diary", "today")).toBe("/diary/today");
  });

  it("피드는 상세 화면이 없어 slug가 있어도 목록 경로를 돌려준다", () => {
    expect(postHref("feed", "photo")).toBe("/feed");
  });
});

describe("articleListHref", () => {
  it("카테고리와 1쪽은 경로에 쪽 번호를 붙이지 않는다", () => {
    expect(articleListHref()).toBe("/article");
    expect(articleListHref(null, 1)).toBe("/article");
    expect(articleListHref("개발")).toBe(`/article/category/${encodeURIComponent("개발")}`);
  });

  it("2쪽부터는 경로 끝에 /page/<n>을 붙인다", () => {
    expect(articleListHref(null, 3)).toBe("/article/page/3");
    expect(articleListHref("dev", 2)).toBe("/article/category/dev/page/2");
  });
});
