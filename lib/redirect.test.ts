import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/redirect";

describe("로그인 뒤 돌아갈 경로", () => {
  it.each([
    ["//evil.example"],
    ["/\\evil.example"],
    ["/\t/evil.example"],
    // URL 파서가 점 조각을 정리하면 `//evil.example`이 남는다
    ["/.//evil.example"],
    ["/..//evil.example"],
    ["/a/..//evil.example"],
    ["/%2e//evil.example"],
    ["/./\\evil.example"],
    ["https://evil.example"],
    ["evil"],
    [""],
    [null],
  ])("같은 출처 경로가 아닌 %j는 /로 바꾼다", (value) => {
    expect(safeRedirectPath(value)).toBe("/");
  });

  it("같은 출처 경로는 쿼리까지 그대로 둔다", () => {
    expect(safeRedirectPath("/article/foo?x=1")).toBe("/article/foo?x=1");
  });
});
