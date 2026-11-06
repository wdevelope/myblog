import { describe, expect, it } from "vitest";
import { feedCardContent } from "@/app/feed/feedCardContent";
import { renderMarkdown } from "@/lib/markdown";

const A = "post-images-public:2026/11/a.jpg";
const B = "post-images-public:2026/11/b.jpg";
const C = "post-images-public:2026/11/c.jpg";

function post(content: string, imageKeys: string[] = [], thumbnailImageKey: string | null = null) {
  return { content, imageKeys, thumbnailImageKey };
}

describe("피드 카드 사진", () => {
  it("첨부가 있으면 첨부 전체를 올린 순서대로 보인다", () => {
    expect(feedCardContent(post("글", [A, B, C])).imageKeys).toEqual([A, B, C]);
  });

  it("옛 글의 썸네일이 첨부와 겹쳐도 맨 앞에 한 번만 보인다", () => {
    expect(feedCardContent(post("글", [A, B], B)).imageKeys).toEqual([B, A]);
  });

  it("첨부가 없으면 본문 첫 사진이 표지다", () => {
    expect(feedCardContent(post(`글\n\n![](${A})\n\n![](${B})`)).imageKeys).toEqual([A]);
  });

  it("사진이 없으면 표지도 없다", () => {
    expect(feedCardContent(post("글")).imageKeys).toEqual([]);
  });

  it("표지가 된 본문 사진은 크기·정렬이 붙어 있어도 본문에서 빠진다", () => {
    const { imageKeys, content } = feedCardContent(post(`![](${A}#w=60&align=center)\n\n글`));

    expect(imageKeys).toEqual([A]);
    expect(content).toBe("글");
  });

  it("같은 사진을 본문에 두 번 넣어도 표지로 한 번만 보인다", () => {
    expect(feedCardContent(post(`![](${A})\n\n글\n\n![](${A})`)).content).not.toContain(A);
  });

  it("첨부와 같은 사진이 본문에 있으면 본문에서 빠진다", () => {
    expect(feedCardContent(post(`글\n\n![](${A})`, [A])).content).not.toContain(A);
  });

  it("카드 사진이 아닌 본문 사진은 본문에 남는다", () => {
    const { content } = feedCardContent(post(`![](${A})\n\n글\n\n![](${B})`));

    expect(renderMarkdown(content)).toContain("b.jpg");
    expect(renderMarkdown(content)).not.toContain("a.jpg");
  });

  it("사진을 뺀 자리에 빈 줄이 겹쳐 벌어지지 않는다", () => {
    expect(feedCardContent(post(`위\n\n![](${A})\n\n아래`)).content).toBe("위\n\n아래");
  });

  it("글 사이에 낀 사진을 빼도 앞뒤 글이 남는다", () => {
    expect(feedCardContent(post(`앞 ![](${A}) 뒤`)).content).toBe("앞 뒤");
  });

  it.each([
    ["외부 주소", "https://example.com/a.jpg"],
    ["비공개 버킷", "post-images-private:2026/11/a.jpg"],
  ])("%s 사진은 표지로 쓰지 않고 본문에 둔다", (_, url) => {
    const source = `글\n\n![](${url})`;

    expect(feedCardContent(post(source))).toMatchObject({ imageKeys: [], content: source });
  });
});

describe("피드 카드 더 보기", () => {
  it("글자가 140자 이하이고 다른 내용이 없으면 없다", () => {
    expect(feedCardContent(post("가".repeat(140))).hasMore).toBe(false);
  });

  it("글자가 140자를 넘으면 있다", () => {
    expect(feedCardContent(post("가".repeat(141))).hasMore).toBe(true);
  });

  it("사진이 표지 한 장뿐이면 없다", () => {
    expect(feedCardContent(post(`글\n\n![](${A})`)).hasMore).toBe(false);
  });

  it("글이 없고 사진만 두 장이면 나머지 사진을 볼 수 있게 있다", () => {
    expect(feedCardContent(post(`![](${A})\n![](${B})`))).toMatchObject({ excerpt: "", hasMore: true });
  });

  it("첨부가 있고 본문에도 다른 사진이 있으면 있다", () => {
    expect(feedCardContent(post(`글\n\n![](${B})`, [A])).hasMore).toBe(true);
  });

  it.each([
    ["코드블록", "글\n\n```\nconst a = 1;\n```"],
    ["블록 수식", "글\n\n$$\nx^2\n$$"],
    ["글 속 수식", "글 $x^2$ 끝"],
  ])("짧은 글이어도 요약에 없는 %s이 있으면 있다", (_, content) => {
    expect(feedCardContent(post(content)).hasMore).toBe(true);
  });

  it("글자로 쓴 태그와 달러 기호는 다른 내용으로 치지 않는다", () => {
    expect(feedCardContent(post('<img> <pre> class="katex", 값은 5$')).hasMore).toBe(false);
  });
});
