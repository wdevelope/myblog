import { describe, expect, it } from "vitest";
import { htmlToMarkdown, isHtmlContent, lossyFeatures } from "./convert-html-to-markdown.mjs";

describe("CKEditor HTML → 마크다운 변환", () => {
  it("제목·문단·굵게·기울임·목록·인용·구분선·인라인 코드를 바꾼다", () => {
    const markdown = htmlToMarkdown(
      [
        "<h2>제목</h2>",
        "<p><strong>굵게</strong>와 <b>굵게2</b>, <i>기울임</i>과 <code>코드</code></p>",
        "<ul><li>하나</li><li>둘</li></ul>",
        "<ol><li>첫째</li></ol>",
        "<blockquote><p>인용</p></blockquote>",
        "<hr>",
      ].join(""),
    );
    expect(markdown).toBe(
      [
        "## 제목",
        "",
        "**굵게**와 **굵게2**, *기울임*과 `코드`",
        "",
        "-   하나",
        "-   둘",
        "",
        "1.  첫째",
        "",
        "> 인용",
        "",
        "---",
      ].join("\n"),
    );
  });

  it("줄바꿈 태그는 줄바꿈 하나로 바꾼다", () => {
    expect(htmlToMarkdown("<p>첫 줄<br>둘째 줄</p>")).toBe("첫 줄\n둘째 줄");
  });

  it("이미지 프록시 주소와 공개 버킷 주소를 버킷 키로 바꾼다", () => {
    expect(
      htmlToMarkdown('<figure class="image"><img src="/api/images?bucket=post-images-public&amp;path=2026-01-01%2Fa.png"></figure>'),
    ).toBe("![](post-images-public:2026-01-01/a.png)");
    expect(
      htmlToMarkdown(
        '<p><img alt="고양이" src="https://abc.supabase.co/storage/v1/object/public/post-images-public/2026-01-01/b.png"></p>',
      ),
    ).toBe("![고양이](post-images-public:2026-01-01/b.png)");
    // 키에 공백·괄호가 생기면 마크다운 이미지 문법이 깨지므로 원래 주소를 둔다.
    const spaced = "https://abc.supabase.co/storage/v1/object/public/post-images-public/2026-01-01/b%20c.png";
    expect(htmlToMarkdown(`<p><img src="${spaced}"></p>`)).toBe(`![](${spaced})`);
    expect(htmlToMarkdown('<p><img src="https://example.com/a.png"></p>')).toBe("![](https://example.com/a.png)");
  });

  it("머리 행이 있는 표를 GFM 표로 바꾼다", () => {
    expect(
      htmlToMarkdown(
        "<figure class=\"table\"><table><thead><tr><th>이름</th><th>값</th></tr></thead><tbody><tr><td>a</td><td>1</td></tr></tbody></table></figure>",
      ),
    ).toBe("| 이름 | 값 |\n| --- | --- |\n| a | 1 |");
  });

  it("형광펜·밑줄·취소선을 새 문법으로 바꾼다", () => {
    expect(htmlToMarkdown("<p><mark class=\"marker-yellow\">형광</mark> <u>밑줄</u> <s>취소</s></p>")).toBe(
      "==형광== ++밑줄++ ~~취소~~",
    );
  });

  it("본문의 $는 수식으로 읽히지 않게 이스케이프한다", () => {
    expect(htmlToMarkdown("<p>가격은 $10이고 $20이다</p>")).toBe("가격은 \\$10이고 \\$20이다");
  });

  it("인라인 style은 버리고 글자는 남긴다", () => {
    expect(htmlToMarkdown('<p><span style="color:red">빨간 글</span></p>')).toBe("빨간 글");
  });

  it("굵게 안의 굵게와 인라인 코드 안의 서식은 풀어서 한 번만 굵게 한다", () => {
    expect(
      htmlToMarkdown("<ul><li><strong><code><strong>$set</strong></code><strong> (멱등함):</strong></strong> 설명</li></ul>"),
    ).toBe("-   **`$set` (멱등함):** 설명");
  });

  it("붙어 있는 굵게 두 개는 하나로 합친다", () => {
    expect(htmlToMarkdown("<p><strong>언제</strong><strong>(ISR),</strong> 어떻게</p>")).toBe("**언제(ISR),** 어떻게");
  });

  it("문장부호만 굵게 한 부분은 굵게를 뺀다", () => {
    // &nbsp;는 원본 그대로 줄바꿈 없는 공백(U+00A0)으로 남는다.
    expect(htmlToMarkdown("<p><strong>가장 중요</strong>⭐️<strong>)</strong>&nbsp;AI</p>")).toBe(
      "**가장 중요**⭐️) AI",
    );
  });

  it("표 칸 안의 문단은 한 줄로 이어 표가 깨지지 않게 한다", () => {
    expect(
      htmlToMarkdown(
        "<table><thead><tr><th><p><strong>구분</strong></p></th><th><p>값</p></th></tr></thead><tbody><tr><td><p>a</p><p>b</p></td><td>1</td></tr></tbody></table>",
      ),
    ).toBe("| **구분** | 값 |\n| --- | --- |\n| a b | 1 |");
  });

  it("본문에 그대로 쓴 주소의 밑줄은 이스케이프하지 않는다", () => {
    expect(htmlToMarkdown("<p>영상 https://youtu.be/ab_cd_ef 요약</p>")).toBe("영상 https://youtu.be/ab_cd_ef 요약");
  });
});

describe("변환 대상과 손실 판별", () => {
  it("CKEditor HTML은 변환 대상이고 이미 마크다운인 본문은 아니다", () => {
    expect(isHtmlContent("<p>안녕</p>")).toBe(true);
    expect(isHtmlContent("## 제목\n\n**굵게**")).toBe(false);
  });

  it("사라지는 서식과 남은 HTML을 알려 준다", () => {
    expect(lossyFeatures('<p><span style="color:red">a</span></p>', "a")).toEqual(["인라인 style"]);
    expect(lossyFeatures("<p>a</p>", "a <video>")).toEqual(["변환 뒤 남은 HTML"]);
    expect(lossyFeatures("<p>a</p>", "a")).toEqual([]);
  });
});
