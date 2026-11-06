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

  it("이미지 주소 끝 조각의 폭·정렬을 스타일과 클래스로 바꾸고 조각은 주소에서 뗀다", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
    const html = renderMarkdown("![](post-images-public:2026-10-22/a.png#w=60&align=center)");
    expect(html).toContain(`src="${SUPABASE_URL}/storage/v1/object/public/post-images-public/2026-10-22/a.png"`);
    expect(html).toContain('style="width:60%"');
    expect(html).toContain('class="img-align-center"');
    expect(html).not.toContain("#w=60");
  });

  it("잘못된 폭·정렬 값은 무시하고 옵션이 아닌 조각은 주소에 남긴다", () => {
    const invalid = renderMarkdown("![](https://example.com/a.png#w=500&align=top)");
    expect(invalid).toContain('src="https://example.com/a.png"');
    expect(invalid).not.toContain("style=");
    expect(invalid).not.toContain("class=");
    expect(renderMarkdown("![](https://example.com/a.png#section)")).toContain(
      'src="https://example.com/a.png#section"',
    );
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
    expect(html).toContain("<ul");
    expect(html).toContain("<ol>");
    expect(html).toContain("<blockquote");
    expect(html).toContain("<hr");
    expect(html).toContain('<code class="language-ts">const a = 1 &lt; 2;');
    expect(html).toContain("<table>");
  });

  it("표는 좁은 화면에서 가로로 스크롤되도록 감싼다", () => {
    const html = renderMarkdown(["| 이름 | 값 |", "| --- | --- |", "| a | 1 |"].join("\n"));
    expect(html).toMatch(/^<div class="table-scroll"><table>/);
    expect(html).toMatch(/<\/table>\n?<\/div>\n?$/);
  });
});

describe("자동 링크", () => {
  const link = (url: string) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;

  it("주소 바로 뒤에 붙은 조사는 링크에서 빼고 글자로 남긴다", () => {
    expect(renderMarkdown("주소는 https://a.com입니다.")).toBe(`<p>주소는 ${link("https://a.com")}입니다.</p>\n`);
    expect(renderMarkdown("https://a.com에서 확인")).toBe(`<p>${link("https://a.com")}에서 확인</p>\n`);
    expect(renderMarkdown("https://www.a.co.kr입니다")).toBe(`<p>${link("https://www.a.co.kr")}입니다</p>\n`);
    expect(renderMarkdown("https://foo.io입니다")).toBe(`<p>${link("https://foo.io")}입니다</p>\n`);
    expect(renderMarkdown("**https://a.com입니다**")).toBe(`<p><strong>${link("https://a.com")}입니다</strong></p>\n`);
  });

  it("`//`로 시작하는 주소도 조사를 뗀다", () => {
    expect(renderMarkdown("//a.com입니다")).toBe('<p><a href="//a.com">//a.com</a>입니다</p>\n');
  });

  it("도메인이 아닌 주소 끝의 조사도 뗀다", () => {
    expect(renderMarkdown("http://localhost입니다")).toBe(`<p>${link("http://localhost")}입니다</p>\n`);
  });

  it("경로·검색어의 한글과 한글 도메인은 주소의 일부로 둔다", () => {
    expect(renderMarkdown("https://ko.wikipedia.org/wiki/한글")).toContain(
      'href="https://ko.wikipedia.org/wiki/%ED%95%9C%EA%B8%80"',
    );
    expect(renderMarkdown("https://ko.wikipedia.org/wiki/BTS의_음반")).toContain(
      'href="https://ko.wikipedia.org/wiki/BTS%EC%9D%98_%EC%9D%8C%EB%B0%98"',
    );
    expect(renderMarkdown("https://a.com?q=한글")).toContain('href="https://a.com?q=%ED%95%9C%EA%B8%80"');
    expect(renderMarkdown("https://한글.com")).toContain('href="https://xn--bj0bj06e.com"');
    expect(renderMarkdown("https://www.ab한글.com")).toContain('href="https://www.xn--ab-f12i831k.com"');
  });

  it("한글 도메인 뒤의 조사도 뗀다", () => {
    expect(renderMarkdown("https://한글.com입니다")).toContain('>https://한글.com</a>입니다');
  });

  it("파일 이름처럼 생긴 글자는 링크로 만들지 않는다", () => {
    for (const name of ["README.md 파일", "main.py", "docs.rs", "a.sh", "foo.io"]) {
      expect(renderMarkdown(name)).not.toContain("<a ");
    }
  });

  it("주소를 다 적으면 국가 도메인도 링크로 만든다", () => {
    expect(renderMarkdown("https://docs.rs")).toContain(link("https://docs.rs"));
  });

  it("정상 주소는 그대로 링크로 만든다", () => {
    expect(renderMarkdown("https://a.com/path?q=1")).toContain('href="https://a.com/path?q=1"');
    expect(renderMarkdown("www.example.co.kr")).toContain('href="http://www.example.co.kr"');
    expect(renderMarkdown("example.co.kr")).toContain('href="http://example.co.kr"');
    expect(renderMarkdown("naver.com")).toContain('href="http://naver.com"');
    expect(renderMarkdown("me@a.com")).toContain('href="mailto:me@a.com"');
  });
});

describe("빈 줄 간격", () => {
  const gap = (rows: number) => `style="margin-top:calc(var(--md-line) * ${rows})"`;

  it("빈 줄 수만큼 다음 블록을 띄운다", () => {
    expect(renderMarkdown("하나\n\n둘\n\n\n셋")).toBe(`<p>하나</p>\n<p ${gap(1)}>둘</p>\n<p ${gap(2)}>셋</p>\n`);
  });

  it("공백만 있는 줄도 빈 줄로 센다", () => {
    expect(renderMarkdown("하나\n   \n둘")).toBe(`<p>하나</p>\n<p ${gap(1)}>둘</p>\n`);
  });

  it("줄바꿈하지 않는 공백만 있는 줄은 문단이라 빈 줄로 세지 않는다", () => {
    expect(renderMarkdown("하나\n\n\u00a0\n\n둘")).toBe(`<p>하나</p>\n<p ${gap(1)}>\u00a0</p>\n<p ${gap(1)}>둘</p>\n`);
  });

  it("빈 줄 없이 이어진 블록은 띄우지 않는다", () => {
    expect(renderMarkdown("## 제목\n본문\n- 항목")).toBe("<h2>제목</h2>\n<p>본문</p>\n<ul>\n<li>항목</li>\n</ul>\n");
  });

  it("제목·인용·목록은 바깥 태그만 띄우고 첫 자식은 띄우지 않는다", () => {
    expect(renderMarkdown("문단\n\n## 제목")).toContain(`<h2 ${gap(1)}>제목</h2>`);
    expect(renderMarkdown("문단\n\n> 인용")).toContain(`<blockquote ${gap(1)}>\n<p>인용</p>`);
    expect(renderMarkdown("문단\n\n- 항목")).toContain(`<ul ${gap(1)}>\n<li>항목</li>`);
    expect(renderMarkdown("문단\n\n1. 항목")).toContain(`<ol ${gap(1)}>\n<li>항목</li>`);
  });

  it("코드블록·구분선·표·수식은 맨 바깥 태그를 띄운다", () => {
    expect(renderMarkdown("문단\n\n```\n코드\n```")).toContain(`<pre ${gap(1)}><code>코드`);
    expect(renderMarkdown("문단\n\n    코드")).toContain(`<pre ${gap(1)}><code>코드`);
    expect(renderMarkdown("문단\n\n---")).toContain(`<hr ${gap(1)}>`);
    expect(renderMarkdown("문단\n\n| a |\n| - |\n| b |")).toContain(`<div ${gap(1)} class="table-scroll"><table>`);
    expect(renderMarkdown("문단\n\n$$\nx\n$$")).toContain(`<p ${gap(1)} class="katex-block">`);
  });

  it("인용 안에서는 `>`만 있는 줄을 빈 줄로 센다", () => {
    expect(renderMarkdown("> 하나\n>\n> 둘")).toBe(`<blockquote>\n<p>하나</p>\n<p ${gap(1)}>둘</p>\n</blockquote>\n`);
  });

  it("항목 사이에 빈 줄이 있으면 항목을 띄운다", () => {
    expect(renderMarkdown("- 하나\n\n- 둘")).toBe(`<ul>\n<li>\n<p>하나</p>\n</li>\n<li ${gap(1)}>\n<p>둘</p>\n</li>\n</ul>\n`);
  });

  it("글 맨 앞의 빈 줄은 띄우지 않는다", () => {
    expect(renderMarkdown("\n\n하나")).toBe("<p>하나</p>\n");
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
