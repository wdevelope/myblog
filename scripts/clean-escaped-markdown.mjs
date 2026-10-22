#!/usr/bin/env node

// CKEditor 시절 마크다운 원문을 글자로 붙여 넣은 글을 정리한다. HTML → 마크다운 변환이 그 글자를 `\*\*`·`\##`처럼
// 이스케이프해 두어서 글 화면과 작성 칸에 `**`·`##`가 글자로 보인다.
// - 기본(dry-run): DB는 건드리지 않고 tmp/clean-escaped-markdown/에 원본 백업·글별 전후 본문·보고서를 쓴다.
// - --apply: 백업을 먼저 쓰고 바뀌는 글만 고친다. 이미 정리한 글은 결과가 같아 건너뛰므로 다시 돌려도 된다.
// - --restore <backup.json>: 백업의 본문으로 되돌린다.
// 접속 정보는 .env.local·.env의 NEXT_PUBLIC_SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY를 쓴다.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import MarkdownIt from "markdown-it";
import markdownItCjkFriendly from "markdown-it-cjk-friendly";

const OUT_DIR = "tmp/clean-escaped-markdown";

// 글마다 원문을 보고 고른 정리 방식.
// source: 원문 전체를 붙여 넣어 문단마다 굵게가 씌워진 글. pairs: 굵게·기울임 몇 군데만 글자로 남은 글.
// post-19dd59는 줄머리에 `*`를 글자로 쓴 글이라 짝이 없어 그대로 남는다.
export const TARGETS = {
  "post-19dd59": "pairs",
  "post-307260": "source",
  "post-e7ee21": "pairs",
  "post-a71719": "pairs",
  "post-4ef421": "pairs",
  "post-408a78": "pairs",
  "post-2b5d55": "pairs",
};

// 이스케이프(`\` + 글자)를 한 덩어리로 먼저 잡아, 이스케이프된 `*`가 굵게 기호로 읽히지 않게 한다.
const TOKEN = /\\[\s\S]|\*\*|[\s\S]/g;
const ASCII_PUNCTUATION = /^[!-/:-@[-`{-~]$/;

// 붙여 넣을 때 생긴 굵게(이스케이프 안 된 `**`)를 걷고 원문 기호의 이스케이프를 푼다.
// `\$`는 HTML 변환 때 수식으로 읽히지 않게 넣은 것이라 남긴다.
export function restoreSource(markdown) {
  return markdown.replace(TOKEN, (token) => {
    if (token === "**") return "";
    if (token.length === 2 && token[1] !== "$" && ASCII_PUNCTUATION.test(token[1])) return token[1];
    return token;
  });
}

// 한 줄 안에서 짝이 맞는 `\*\*…\*\*`·`\*…\*`만 굵게·기울임으로 되돌린다. 짝 없는 `\*`는 글자 그대로 둔다.
export function restorePairs(markdown) {
  return markdown
    .replace(/\\\*\\\*(?=\S)(.+?)(?<=\S)\\\*\\\*/g, "**$1**")
    .replace(/\\\*(?=[^\s*\\])(.+?)(?<=\S)\\\*/g, "*$1*");
}

export function cleanContent(markdown, mode) {
  if (mode === "pairs") return restorePairs(markdown);
  // 정리를 마친 글에는 이스케이프가 남지 않는다. 다시 돌렸을 때 되살린 굵게까지 걷지 않게 그대로 둔다.
  return /\\[*#`]/.test(markdown) ? restoreSource(markdown) : markdown;
}

// 글 화면 렌더러와 같은 강조 규칙으로 그려, 서식이 되지 못하고 글자로 남은 `*`를 센다.
const md = new MarkdownIt({ html: false, linkify: true, breaks: true }).use(markdownItCjkFriendly);

export function literalStars(markdown) {
  const text = md
    .render(markdown)
    .replace(/<code>[\s\S]*?<\/code>/g, "")
    .replace(/<[^>]+>/g, "");
  return text.split("*").length - 1;
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

async function loadTargets(supabase) {
  const { data, error } = await supabase
    .from("posts")
    .select("id,slug,type,visibility,title,content,updated_at")
    .in("slug", Object.keys(TARGETS))
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

async function dryRun(supabase) {
  const posts = await loadTargets(supabase);
  const backup = writeBackup(posts);
  const dir = path.join(OUT_DIR, "posts");
  fs.mkdirSync(dir, { recursive: true });
  const rows = posts.map((post) => {
    const mode = TARGETS[post.slug];
    const cleaned = cleanContent(post.content, mode);
    fs.writeFileSync(path.join(dir, `${post.slug}.before.md`), `${post.content}\n`);
    fs.writeFileSync(path.join(dir, `${post.slug}.after.md`), `${cleaned}\n`);
    const changed = cleaned === post.content ? "그대로" : "바뀜";
    return `| ${post.slug} | ${post.visibility} | ${post.title} | ${mode} | ${changed} | ${literalStars(post.content)} → ${literalStars(cleaned)} |`;
  });
  const report = [
    `# 이스케이프된 마크다운 정리 dry-run (${new Date().toISOString()})`,
    "",
    `- 대상 ${posts.length}개 / 목록 ${Object.keys(TARGETS).length}개`,
    `- 원본 백업: ${backup}`,
    `- 글별 결과: ${dir}/<slug>.before.md · .after.md`,
    "",
    "| slug | 공개 | 제목 | 방식 | 결과 | 글 화면에 글자로 남는 `*` |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
  fs.writeFileSync(path.join(OUT_DIR, "report.md"), report);
  console.log(report);
}

async function apply(supabase) {
  const posts = await loadTargets(supabase);
  const backup = writeBackup(posts);
  console.log(`원본 백업: ${backup}`);
  const targets = posts.filter((post) => cleanContent(post.content, TARGETS[post.slug]) !== post.content);
  // 하나라도 실패하면 멈춘다. 이미 고친 글은 백업으로 되돌리거나 다시 돌려 나머지를 고친다.
  for (const [index, post] of targets.entries()) {
    const { error } = await supabase
      .from("posts")
      .update({ content: cleanContent(post.content, TARGETS[post.slug]), updated_at: post.updated_at })
      .eq("id", post.id);
    if (error) throw new Error(`${post.slug} 정리 실패(${index}/${targets.length}개 완료): ${error.message}`);
  }
  console.log(`정리 완료: ${targets.length}개 (건너뜀 ${posts.length - targets.length}개)`);
}

async function restore(supabase, file) {
  const posts = JSON.parse(fs.readFileSync(file, "utf-8"));
  for (const post of posts) {
    const { error } = await supabase
      .from("posts")
      .update({ content: post.content, updated_at: post.updated_at })
      .eq("id", post.id);
    if (error) throw new Error(`${post.slug} 복원 실패: ${error.message}`);
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
