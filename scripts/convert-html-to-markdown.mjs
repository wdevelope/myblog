#!/usr/bin/env node

// 로드맵 8단계 4번: 기존 글 본문(CKEditor HTML)을 마크다운으로 한 번 바꾼다.
// - 기본(dry-run): DB는 건드리지 않고 tmp/convert-html-to-markdown/에 원본 백업·글별 변환 결과·보고서를 쓴다.
// - --apply: 백업을 먼저 쓰고 HTML 본문인 글만 마크다운으로 바꾼다. 이미 마크다운인 글은 건너뛰므로 다시 돌려도 된다.
// - --restore <backup.json>: 백업의 본문으로 되돌린다.
// 접속 정보는 .env.local·.env의 NEXT_PUBLIC_SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY를 쓴다.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import TurndownService from "turndown";
import { tables } from "turndown-plugin-gfm";

const OUT_DIR = "tmp/convert-html-to-markdown";
const IMAGE_BUCKETS = new Set(["post-images-public", "post-images-private"]);
const HTML_TAG =
  /<(?:p|h[1-6]|ul|ol|li|div|br|span|strong|b|i|em|u|s|mark|figure|img|table|blockquote|pre|code|hr|a)\b[^>]*>/i;
const PUNCTUATION_ONLY = /^[\s\p{P}\p{S}]*$/u;

function hasAncestor(node, names) {
  for (let parent = node.parentNode; parent; parent = parent.parentNode) {
    if (names.includes(parent.nodeName)) return true;
  }
  return false;
}

function isFirstCell(node) {
  let previous = node.previousSibling;
  while (previous && previous.nodeType !== 1) previous = previous.previousSibling;
  return !previous;
}

// /api/images?bucket=&path= 프록시 주소와 Supabase 공개 주소를 `버킷:경로` 키로 바꾼다.
// 키에 공백·괄호가 생기면 마크다운 이미지 문법이 깨지므로 그때는 원래 주소를 둔다.
function toImageKey(src) {
  const url = new URL(src, "http://localhost");
  let bucket = null;
  let objectPath = null;
  if (url.pathname === "/api/images") {
    bucket = url.searchParams.get("bucket");
    objectPath = url.searchParams.get("path");
  } else {
    const match = /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/.exec(url.pathname);
    if (match) {
      bucket = match[1];
      objectPath = decodeURIComponent(match[2]);
    }
  }
  if (!bucket || !objectPath || !IMAGE_BUCKETS.has(bucket) || /[\s()]/.test(objectPath)) return src;
  return `${bucket}:${objectPath}`;
}

function createTurndown() {
  // br을 줄바꿈 하나로 둔다. 렌더러가 breaks: true라 그것만으로 줄이 바뀐다.
  const turndown = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    strongDelimiter: "**",
    br: "",
  });
  turndown.use(tables);
  // 렌더러의 수식 플러그인이 `$`를 수식 시작으로 읽지 않게 본문의 `$`를 이스케이프한다.
  const escapeMarkdown = turndown.escape.bind(turndown);
  turndown.escape = (text) => escapeMarkdown(text).replace(/\$/g, "\\$");
  turndown.addRule("highlight", { filter: "mark", replacement: (content) => `==${content}==` });
  turndown.addRule("underline", { filter: "u", replacement: (content) => `++${content}++` });
  turndown.addRule("strikethrough", {
    filter: ["s", "del", "strike"],
    replacement: (content) => `~~${content}~~`,
  });
  turndown.addRule("imageKey", {
    filter: "img",
    replacement: (_content, node) => {
      const src = node.getAttribute("src");
      if (!src) return "";
      return `![${node.getAttribute("alt") ?? ""}](${toImageKey(src)})`;
    },
  });
  // 굵게 안의 굵게, 문장부호만 굵게 한 부분은 CommonMark에서 `**`가 글자로 나오므로 굵게 표시 없이 둔다.
  turndown.addRule("strong", {
    filter: ["strong", "b"],
    replacement: (content, node) => {
      if (hasAncestor(node, ["STRONG", "B"]) || PUNCTUATION_ONLY.test(content)) return content;
      return `**${content}**`;
    },
  });
  // 인라인 코드 안의 서식은 마크다운으로 나타낼 수 없으므로 글자만 쓴다.
  turndown.addRule("inlineCode", {
    filter: (node) => node.nodeName === "CODE" && node.parentNode?.nodeName !== "PRE",
    replacement: (_content, node) => {
      const code = node.textContent ?? "";
      if (!code) return "";
      const fence = code.includes("`") ? "``" : "`";
      const pad = code.startsWith("`") || code.endsWith("`") ? " " : "";
      return `${fence}${pad}${code}${pad}${fence}`;
    },
  });
  // 표 칸 안의 문단·줄바꿈이 줄을 나누면 표가 깨지므로 한 줄로 잇는다.
  turndown.addRule("tableCell", {
    filter: ["th", "td"],
    replacement: (content, node) => `${isFirstCell(node) ? "| " : " "}${content.replace(/\s+/g, " ").trim()} |`,
  });
  return turndown;
}

const turndown = createTurndown();

export function isHtmlContent(content) {
  return HTML_TAG.test(content ?? "");
}

export function htmlToMarkdown(html) {
  return (
    turndown
      .turndown(html)
      // 붙어 있던 굵게 두 개(`**A****B**`)를 하나로 합친다.
      .replaceAll("****", "")
      // 본문에 그대로 쓴 주소는 렌더러의 linkify가 백슬래시까지 주소로 읽으므로 이스케이프를 되돌린다.
      .replace(/https?:\/\/[^\s<>]+/g, (url) => url.replace(/\\([\\`*_[\]$])/g, "$1"))
      .trim()
  );
}

export function lossyFeatures(html, markdown) {
  const losses = [];
  if (/\sstyle=/i.test(html)) losses.push("인라인 style");
  if (/<[a-z][a-z0-9]*[\s>/]/i.test(markdown)) losses.push("변환 뒤 남은 HTML");
  return losses;
}

async function createServiceClient() {
  const { config } = await import("dotenv");
  config({ path: [".env.local", ".env"], quiet: true });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY가 필요합니다(.env.local 또는 .env).");
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function loadPosts(supabase) {
  const { data, error } = await supabase
    .from("posts")
    .select("id,slug,type,content,updated_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`글 조회 실패: ${error.message}`);
  return data;
}

function writeBackup(posts) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `backup-${new Date().toISOString().replaceAll(":", "-")}.json`);
  fs.writeFileSync(file, JSON.stringify(posts, null, 2));
  return file;
}

function reviewNotes(post, markdown) {
  const notes = lossyFeatures(post.content, markdown);
  if (/<table/i.test(post.content)) notes.push("표(화면 확인)");
  if (/<img/i.test(post.content)) notes.push("이미지(화면 확인)");
  return notes;
}

async function dryRun(supabase) {
  const posts = await loadPosts(supabase);
  const backup = writeBackup(posts);
  const targets = posts.filter((post) => isHtmlContent(post.content));
  const flagged = [];
  for (const post of targets) {
    const markdown = htmlToMarkdown(post.content);
    const dir = path.join(OUT_DIR, "posts", post.type);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${post.slug}.html`), post.content);
    fs.writeFileSync(path.join(dir, `${post.slug}.md`), `${markdown}\n`);
    const notes = reviewNotes(post, markdown);
    if (notes.length) flagged.push({ post, notes });
  }
  const report = [
    `# HTML → 마크다운 변환 dry-run (${new Date().toISOString()})`,
    "",
    `- 전체 ${posts.length}개, 변환 대상 ${targets.length}개, 이미 마크다운이라 건너뛸 글 ${posts.length - targets.length}개`,
    `- 원본 백업: ${backup}`,
    `- 글별 결과: ${OUT_DIR}/posts/<타입>/<slug>.html · .md`,
    "",
    "## 확인할 글",
    "",
    flagged.length ? "| 타입 | slug | 확인할 점 |\n| --- | --- | --- |" : "없음",
    ...flagged.map(({ post, notes }) => `| ${post.type} | ${post.slug} | ${notes.join(", ")} |`),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(OUT_DIR, "report.md"), report);
  console.log(report);
}

async function apply(supabase) {
  const posts = await loadPosts(supabase);
  const backup = writeBackup(posts);
  console.log(`원본 백업: ${backup}`);
  const targets = posts.filter((post) => isHtmlContent(post.content));
  // 하나라도 실패하면 멈춘다. 이미 바꾼 글은 백업으로 되돌리거나 다시 돌려 나머지를 바꾼다.
  for (const [index, post] of targets.entries()) {
    const { error } = await supabase
      .from("posts")
      .update({ content: htmlToMarkdown(post.content), updated_at: post.updated_at })
      .eq("id", post.id);
    if (error) throw new Error(`${post.type}/${post.slug} 변환 실패(${index}/${targets.length}개 완료): ${error.message}`);
  }
  console.log(`변환 완료: ${targets.length}개 (건너뜀 ${posts.length - targets.length}개)`);
}

async function restore(supabase, file) {
  const posts = JSON.parse(fs.readFileSync(file, "utf-8"));
  for (const post of posts) {
    const { error } = await supabase
      .from("posts")
      .update({ content: post.content, updated_at: post.updated_at })
      .eq("id", post.id);
    if (error) throw new Error(`${post.type}/${post.slug} 복원 실패: ${error.message}`);
  }
  console.log(`복원 완료: ${posts.length}개`);
}

async function main() {
  const args = process.argv.slice(2);
  const supabase = await createServiceClient();
  if (args[0] === "--apply") return apply(supabase);
  if (args[0] === "--restore") {
    if (!args[1]) throw new Error("사용법: --restore <backup.json>");
    return restore(supabase, args[1]);
  }
  return dryRun(supabase);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
