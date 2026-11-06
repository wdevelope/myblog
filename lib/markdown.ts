import markdownItKatex from "@vscode/markdown-it-katex";
import MarkdownIt, { type RendererRule, type Token } from "markdown-it";
import markdownItCjkFriendly from "markdown-it-cjk-friendly";
import markdownItIns from "markdown-it-ins";
import markdownItMark from "markdown-it-mark";
import { PRIVATE_IMAGE_BUCKET, PUBLIC_IMAGE_BUCKET, coverSrcFromImageKey } from "@/lib/image";
import { parseImageUrl } from "@/lib/image-options";

// html: false라 본문에 쓴 태그는 글자로 나간다. 그래서 별도 정화기 없이 렌더링 결과를 그대로 넣어도 된다.
// cjk-friendly는 `**"중요"**는`처럼 문장부호로 끝난 강조 뒤에 조사가 붙으면 굵게가 풀리는 CommonMark 규칙을 고친다.
const md = new MarkdownIt({ html: false, linkify: true, breaks: true })
  .use(markdownItCjkFriendly)
  .use(markdownItMark)
  .use(markdownItIns)
  .use(markdownItKatex, { throwOnError: false });

// 기본값은 두 글자 국가 도메인을 모두 받아 `README.md`·`main.py` 같은 파일 이름이 가짜 링크가 된다. `https://`까지 적은 주소에는 이 목록을 쓰지 않는다.
md.linkify.tlds(["com", "net", "org", "kr"]);

// 호스트 끝 라벨이 `com입니다`처럼 영문·숫자에 한글이 이어지는 주소는 없으므로 조사가 붙은 것이다. 경로·검색어의 한글은
// 진짜 주소(`/wiki/BTS의_음반`)와 구분되지 않아 끊지 않는다. 끝 라벨만 보는 것은 `ab한글.com` 같은 한글 도메인을 지키려는 것이다.
const HOST_WITH_KOREAN_TAIL = /^(?:[a-z]+:)?\/\/[^\s/?#]*[a-z\d](?=\p{sc=Hangul}[^./?#]*(?:[/?#]|$))/iu;

const normalizeLinkMatch = md.linkify.normalize.bind(md.linkify);

md.linkify.normalize = (match) => {
  const host = HOST_WITH_KOREAN_TAIL.exec(match.raw)?.[0];
  if (host) {
    // markdown-it의 두 링크 규칙이 url과 text·lastIndex를 나눠 읽으므로 같이 줄인다.
    match.url = host;
    match.text = host;
    match.lastIndex = match.index + host.length;
  }
  normalizeLinkMatch(match);
};

const IMAGE_KEY = new RegExp(`^(?:${PUBLIC_IMAGE_BUCKET}|${PRIVATE_IMAGE_BUCKET}):`);

const renderToken: RendererRule = (tokens, idx, options, _env, self) =>
  self.renderToken(tokens, idx, options);
const renderImage = md.renderer.rules.image ?? renderToken;
const renderLinkOpen = md.renderer.rules.link_open ?? renderToken;
const renderTableOpen = md.renderer.rules.table_open ?? renderToken;
const renderTableClose = md.renderer.rules.table_close ?? renderToken;

// 크기·정렬은 주소 끝 조각에 있다(lib/image-options). 검증한 값만 스타일·클래스로 옮겨 본문 HTML을 열지 않는다.
md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const { src, options: image } = parseImageUrl(token.attrGet("src") ?? "");
  token.attrSet("src", IMAGE_KEY.test(src) ? coverSrcFromImageKey(src) : src);
  if (image.width) token.attrSet("style", `width:${image.width}%`);
  if (image.align) token.attrSet("class", `img-align-${image.align}`);
  token.attrSet("loading", "lazy");
  return renderImage(tokens, idx, options, env, self);
};

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  if (/^https?:\/\//.test(token.attrGet("href") ?? "")) {
    token.attrSet("target", "_blank");
    token.attrSet("rel", "noopener noreferrer");
  }
  return renderLinkOpen(tokens, idx, options, env, self);
};

// 열이 많은 표가 좁은 화면에서 글자 단위로 쪼개지지 않도록 본문 대신 표만 가로로 스크롤한다.
md.renderer.rules.table_open = (tokens, idx, options, env, self) =>
  `<div class="table-scroll">${renderTableOpen(tokens, idx, options, env, self)}`;

md.renderer.rules.table_close = (tokens, idx, options, env, self) =>
  `${renderTableClose(tokens, idx, options, env, self)}</div>\n`;

// 쓰는 화면은 빈 줄 하나가 한 칸이다. 글 화면도 같은 높이로 띄우도록 블록 앞의 빈 줄 수를 적어 둔다.
// 글 맨 앞과 부모의 첫 자식은 앞에 띄울 블록이 없다. 인용 안에서는 `>`만 있는 줄이 빈 줄이다.
md.core.ruler.push("blank_lines", (state) => {
  const lines = state.src.split("\n");
  const blanksBefore = (line: number) => {
    let rows = 0;
    while (rows < line && !lines[line - rows - 1].replace(/^[ \t>]+/, "")) rows += 1;
    return rows;
  };
  const blocksAtLevel: number[] = [];
  for (const token of state.tokens) {
    if (token.nesting < 0) blocksAtLevel.length = token.level + 1;
    if (token.nesting < 0 || !token.block || !token.map || token.type === "inline") continue;
    const seen = blocksAtLevel[token.level] ?? 0;
    blocksAtLevel[token.level] = seen + 1;
    if (seen) token.meta = { ...token.meta, blankLines: blanksBefore(token.map[0]) };
  }
});

// 코드블록은 `<pre>`, 표는 감싼 `<div>`처럼 바깥 태그가 토큰 속성을 받지 않는 규칙이 있어 그려진 첫 태그에 넣는다.
const withBlankLines =
  (rule: RendererRule): RendererRule =>
  (tokens, idx, options, env, self) => {
    const html = rule(tokens, idx, options, env, self);
    const rows = tokens[idx].meta?.blankLines;
    return rows ? html.replace(/^\s*<\w+/, `$& style="margin-top:calc(var(--md-line) * ${rows})"`) : html;
  };

for (const type of [
  "paragraph_open",
  "heading_open",
  "blockquote_open",
  "bullet_list_open",
  "ordered_list_open",
  "list_item_open",
  "hr",
  "code_block",
  "fence",
  "math_block",
  "table_open",
]) {
  md.renderer.rules[type] = withBlankLines(md.renderer.rules[type] ?? renderToken);
}

export function renderMarkdown(source: string): string {
  return md.render(source);
}

function inlineText(token: Token): string {
  if (token.type === "text" || token.type === "code_inline") return token.content;
  if (token.type === "softbreak" || token.type === "hardbreak") return " ";
  return "";
}

// 요약에는 문단·제목·목록·인용의 글자만 넣는다. 코드블록·블록 수식은 inline 토큰이 없어 빠지고, 이미지는 inlineText가 뺀다.
function plainText(source: string): string {
  return md
    .parse(source, {})
    .filter((token) => token.type === "inline")
    .map((token) => (token.children ?? []).map(inlineText).join(""))
    .join(" ");
}

export function toExcerpt(content: string, maxLength = 240): string {
  let text = plainText(content).replace(/\s+/g, " ").trim();

  if (text.length > maxLength) {
    text = text
      .slice(0, maxLength)
      .replace(/\s+\S*$/, "")
      .trimEnd();
    if (text) text = `${text}…`;
  }

  return text;
}

export function toAutoTitle(content: string, maxLength = 48): string {
  const excerpt = toExcerpt(content, maxLength);
  const title = excerpt.replace(/…$/, "").trim();
  return title || "피드";
}
