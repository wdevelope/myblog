import { describe, expect, it } from "vitest";
import { formatImageUrl, parseImageUrl } from "@/lib/image-options";

const KEY = "post-images-public:2026-10-22/a.png";

describe("본문 이미지 옵션", () => {
  it("주소 끝 조각에서 폭과 정렬을 읽고 주소에서 뗀다", () => {
    expect(parseImageUrl(`${KEY}#w=60&align=center`)).toEqual({
      src: KEY,
      options: { width: 60, align: "center" },
    });
  });

  it("조각이 없으면 옵션 없이 주소를 그대로 돌려준다", () => {
    expect(parseImageUrl(KEY)).toEqual({ src: KEY, options: {} });
  });

  it("범위 밖 폭과 모르는 정렬은 버리고 조각만 뗀다", () => {
    expect(parseImageUrl(`${KEY}#w=5&align=top`)).toEqual({ src: KEY, options: {} });
    expect(parseImageUrl(`${KEY}#w=101`)).toEqual({ src: KEY, options: {} });
    expect(parseImageUrl(`${KEY}#w=50.5`)).toEqual({ src: KEY, options: {} });
  });

  it("옵션이 아닌 조각은 주소의 일부로 그대로 둔다", () => {
    expect(parseImageUrl("https://example.com/a.png#section")).toEqual({
      src: "https://example.com/a.png#section",
      options: {},
    });
    expect(parseImageUrl("https://example.com/a.png#w=60&style=x")).toEqual({
      src: "https://example.com/a.png#w=60&style=x",
      options: {},
    });
  });

  it("주소에 원래 조각이 있어도 마지막 옵션 조각만 읽는다", () => {
    expect(parseImageUrl("https://example.com/a.png#section#align=right")).toEqual({
      src: "https://example.com/a.png#section",
      options: { align: "right" },
    });
  });

  it("옵션을 주소 끝 조각으로 쓰고, 없으면 주소만 돌려준다", () => {
    expect(formatImageUrl(KEY, { width: 60, align: "center" })).toBe(`${KEY}#w=60&align=center`);
    expect(formatImageUrl(KEY, { align: "right" })).toBe(`${KEY}#align=right`);
    expect(formatImageUrl(KEY, {})).toBe(KEY);
  });

  it("쓸 때도 범위 밖 폭은 넣지 않는다", () => {
    expect(formatImageUrl(KEY, { width: 150 })).toBe(KEY);
  });
});
