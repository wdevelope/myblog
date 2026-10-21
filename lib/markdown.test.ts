import { afterEach, describe, expect, it, vi } from "vitest";
import { renderMarkdown, toAutoTitle, toExcerpt } from "@/lib/markdown";

const SUPABASE_URL = "https://project.supabase.co";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("마크다운 렌더링", () => {
  it("굵게·기울임·취소선·밑줄·형광펜을 태그로 바꾼다", () => {
    const html = renderMarkdown("**굵게** *기울임* ~~취소~~ ++밑줄++ ==형광펜==");
    expect(html).toContain("<strong>굵게</strong>");
    expect(html).toContain("<em>기울임</em>");
    expect(html).toContain("<s>취소</s>");
    expect(html).toContain("<ins>밑줄</ins>");
    expect(html).toContain("<mark>형광펜</mark>");
  });

  it("문장부호로 끝나는 강조 뒤에 한국어 조사가 붙어도 굵게 처리한다", () => {
    expect(renderMarkdown('**"중요"**는 꼭 읽는다')).toContain("<strong>&quot;중요&quot;</strong>는");
  });

  it("본문 속 HTML은 태그로 해석하지 않고 글자로 보여 준다", () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
  });

  it("javascript: 링크는 링크로 만들지 않는다", () => {
    expect(renderMarkdown("[눌러](javascript:alert(1))")).not.toContain("href=");
  });

  it("외부 링크는 새 창으로 열고 내부 링크는 그대로 둔다", () => {
    expect(renderMarkdown("[외부](https://example.com)")).toContain(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">외부</a>',
    );
    expect(renderMarkdown("[내부](/article/post-abc123)")).toContain('<a href="/article/post-abc123">내부</a>');
  });

  it("주소만 적어도 링크로 만든다", () => {
    expect(renderMarkdown("참고 https://example.com 입니다")).toContain('href="https://example.com"');
  });

  it("이미지 버킷 키는 화면 주소로 바꾸고 외부 이미지 주소는 그대로 둔다", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
    expect(renderMarkdown("![사진](post-images-public:2026-10-22/a.png)")).toContain(
      `src="${SUPABASE_URL}/storage/v1/object/public/post-images-public/2026-10-22/a.png"`,
    );
    expect(renderMarkdown("![사진](post-images-private:2026-10-22/a.png)")).toContain(
      'src="/api/images?bucket=post-images-private&amp;path=2026-10-22%2Fa.png"',
    );
    expect(renderMarkdown("![사진](https://example.com/a.png)")).toContain('src="https://example.com/a.png"');
  });

  it("이미지는 지연 로딩하고 대체 텍스트를 남긴다", () => {
    const html = renderMarkdown("![고양이](https://example.com/a.png)");
    expect(html).toContain('alt="고양이"');
    expect(html).toContain('loading="lazy"');
  });

  it("인라인 수식과 블록 수식을 KaTeX로 그린다", () => {
    expect(renderMarkdown("넓이는 $\\pi r^2$ 이다")).toContain('class="katex"');
    expect(renderMarkdown("$$\n\\sum_{i=1}^n i\n$$")).toContain("katex-display");
  });

  it("줄을 한 번만 바꿔도 줄바꿈으로 보여 준다", () => {
    expect(renderMarkdown("첫 줄\n둘째 줄")).toContain("첫 줄<br>\n둘째 줄");
  });

  it("제목·목록·인용·구분선·코드블록·표를 그린다", () => {
    const html = renderMarkdown(
      [
        "# 제목",
        "",
        "- 하나",
        "1. 첫째",
        "",
        "> 인용",
        "",
        "---",
        "",
        "```ts",
        "const a = 1 < 2;",
        "```",
        "",
        "| 이름 | 값 |",
        "| --- | --- |",
        "| a | 1 |",
      ].join("\n"),
    );
    expect(html).toContain("<h1>제목</h1>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<ol>");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("<hr>");
    expect(html).toContain('<code class="language-ts">const a = 1 &lt; 2;');
    expect(html).toContain("<table>");
  });

  it("표는 좁은 화면에서 가로로 스크롤되도록 감싼다", () => {
    const html = renderMarkdown(["| 이름 | 값 |", "| --- | --- |", "| a | 1 |"].join("\n"));
    expect(html).toMatch(/^<div class="table-scroll"><table>/);
    expect(html).toMatch(/<\/table>\n?<\/div>\n?$/);
  });
});

describe("본문 요약", () => {
  it("마크다운 문법을 빼고 글자만 남긴다", () => {
    expect(toExcerpt("# 제목\n\n**굵게** 본문과 [링크](https://example.com) 그리고 `코드`")).toBe(
      "제목 굵게 본문과 링크 그리고 코드",
    );
  });

  it("코드블록·이미지·블록 수식은 요약에 넣지 않는다", () => {
    expect(
      toExcerpt("앞 문단\n\n```\nconst a = 1;\n```\n\n![사진](post-images-public:a.png)\n\n$$\nx\n$$\n\n뒤 문단"),
    ).toBe("앞 문단 뒤 문단");
  });

  it("최대 길이를 넘으면 단어 경계에서 자르고 말줄임표를 붙인다", () => {
    expect(toExcerpt("하나 둘 셋 넷", 6)).toBe("하나 둘…");
  });

  it("빈 본문은 빈 문자열이다", () => {
    expect(toExcerpt("")).toBe("");
    expect(toExcerpt("   \n\n  ")).toBe("");
  });
});

describe("피드 자동 제목", () => {
  it("본문 앞부분을 48자 안에서 말줄임표 없이 제목으로 쓴다", () => {
    const title = toAutoTitle(`**${"가나다 ".repeat(20).trim()}**`);
    expect(title.length).toBeLessThanOrEqual(48);
    expect(title.endsWith("…")).toBe(false);
    expect(title.startsWith("가나다 가나다")).toBe(true);
  });

  it("글자가 없으면 제목은 '피드'다", () => {
    expect(toAutoTitle("![](post-images-public:a.png)")).toBe("피드");
  });
});
