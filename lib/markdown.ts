import markdownItKatex from "@vscode/markdown-it-katex";
import MarkdownIt, { type RendererRule, type Token } from "markdown-it";
import markdownItCjkFriendly from "markdown-it-cjk-friendly";
import markdownItIns from "markdown-it-ins";
import markdownItMark from "markdown-it-mark";
import { PRIVATE_IMAGE_BUCKET, PUBLIC_IMAGE_BUCKET, coverSrcFromImageKey } from "@/lib/image";

// html: false라 본문에 쓴 태그는 글자로 나간다. 그래서 별도 정화기 없이 렌더링 결과를 그대로 넣어도 된다.
// cjk-friendly는 `**"중요"**는`처럼 문장부호로 끝난 강조 뒤에 조사가 붙으면 굵게가 풀리는 CommonMark 규칙을 고친다.
const md = new MarkdownIt({ html: false, linkify: true, breaks: true })
  .use(markdownItCjkFriendly)
  .use(markdownItMark)
  .use(markdownItIns)
  .use(markdownItKatex, { throwOnError: false });

const IMAGE_KEY = new RegExp(`^(?:${PUBLIC_IMAGE_BUCKET}|${PRIVATE_IMAGE_BUCKET}):`);

const renderToken: RendererRule = (tokens, idx, options, _env, self) =>
  self.renderToken(tokens, idx, options);
const renderImage = md.renderer.rules.image ?? renderToken;
const renderLinkOpen = md.renderer.rules.link_open ?? renderToken;

md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const src = token.attrGet("src") ?? "";
  if (IMAGE_KEY.test(src)) token.attrSet("src", coverSrcFromImageKey(src));
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
