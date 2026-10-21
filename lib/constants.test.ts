import { describe, expect, it } from "vitest";
import { postHref } from "@/lib/constants";

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
