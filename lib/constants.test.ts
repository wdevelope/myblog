import { describe, expect, it } from "vitest";
import { articleListHref, isNavActive, postHref } from "@/lib/constants";

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

describe("isNavActive", () => {
  it("메뉴 주소와 그 아래 주소에서 켜진다", () => {
    expect(isNavActive("/article", "/article")).toBe(true);
    expect(isNavActive("/article/page/2", "/article")).toBe(true);
  });

  it("이름만 앞부분이 같은 주소에서는 켜지지 않는다", () => {
    expect(isNavActive("/articles", "/article")).toBe(false);
    expect(isNavActive("/feed", "/article")).toBe(false);
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
