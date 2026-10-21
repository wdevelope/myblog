#!/usr/bin/env node

// 커밋 가드. git pre-commit(--staged)과 commit-msg(--commit-msg <파일>) 훅에서 실행한다.
// 편집 가드를 거치지 않은 변경(Bash 편집, 사람·다른 도구의 커밋)도 여기서 같은 규칙으로 막는다.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SPEC_DIR,
  isMigrationPath,
  isSecretPath,
  isSourcePath,
  isTddGuardedPath,
  isTestPath,
} from "./layout.mjs";
import {
  collectTestFiles,
  computeCoverage,
  implementableSpecOf,
  loadSpecs,
  parseSpec,
} from "./specs.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const HANGUL = /[가-힣]/u;
const TEST_TITLE =
  /\b(?:describe|it|test)(?:\.(?:only|skip|todo|concurrent|each\([^)]*\)))*\s*\(\s*(["'`])(.*?)\1/u;
const FOCUSED_TEST = /\b(?:describe|it|test)\.only\s*\(/u;
const SECRET_VALUES = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
  /\bAKIA[0-9A-Z]{16}\b/u,
  // Supabase 키(anon·service role)는 JWT다. 새 형식의 비밀 키는 sb_secret_로 시작한다.
  /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/u,
  /\bsb_secret_[A-Za-z0-9_-]{10,}/u,
];
const CREDENTIAL_URL =
  /\b(?:postgres(?:ql)?|mysql|redis|mongodb(?:\+srv)?):\/\/[^\s:@/]+:([^\s@/]+)@([^\s/:?]+)/u;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);
const TYPE_ESCAPES = [/\bas any\b/u, /\bas unknown as\b/u, /@ts-(?:ignore|nocheck)\b/u];
const COMMIT_SUBJECT = /^(?:feat|fix|refactor|perf|test|docs|build|ci|chore|style)(?:\([^)]+\))?!?: \S/u;
const UNCHECKED_SUBJECT = /^(?:Merge |Revert "|fixup! |squash! )/u;
const NEW_OR_CHANGED = new Set(["A", "M", "R", "C"]);

export function parseNameStatus(text) {
  return text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const [status, first, second] = line.split("\t");
      const code = status[0];
      return second
        ? { status: code, path: second, oldPath: first }
        : { status: code, path: first, oldPath: null };
    });
}

export function parseAddedLines(diffText) {
  const lines = [];
  let file = null;
  let lineNumber = 0;
  for (const raw of diffText.split("\n")) {
    if (raw.startsWith("+++ ")) {
      file = raw === "+++ /dev/null" ? null : raw.replace(/^\+\+\+ b\//u, "");
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/u.exec(raw);
    if (hunk) {
      lineNumber = Number(hunk[1]);
      continue;
    }
    if (file && raw.startsWith("+")) {
      lines.push({ file, line: lineNumber, text: raw.slice(1) });
      lineNumber += 1;
    }
  }
  return lines;
}

function violation(code, location, message) {
  return { code, location, message };
}

function hasSecretValue(text) {
  if (SECRET_VALUES.some((pattern) => pattern.test(text))) return true;
  const credential = CREDENTIAL_URL.exec(text);
  if (!credential) return false;
  const [, password, host] = credential;
  return !password.startsWith("<") && !password.includes("$") && !LOCAL_HOSTS.has(host);
}

function checkEntry({ status, path: filePath, oldPath }, specs) {
  const found = [];
  if (NEW_OR_CHANGED.has(status) && isSecretPath(filePath)) {
    found.push(violation("SECRET_FILE", filePath, "비밀값 파일은 커밋하지 않는다"));
  }
  const migrationTouched =
    (["M", "D"].includes(status) && isMigrationPath(filePath)) ||
    (status === "R" && isMigrationPath(oldPath));
  if (migrationTouched) {
    found.push(
      violation("MIGRATION_APPEND_ONLY", oldPath ?? filePath, "커밋된 마이그레이션은 바꾸지 않는다"),
    );
  }
  if (NEW_OR_CHANGED.has(status) && isSourcePath(filePath) && !implementableSpecOf(specs, filePath)) {
    found.push(
      violation("SPEC_REQUIRED", filePath, "승인·현행·완료 명세의 코드 경로 밖이다(명세 먼저)"),
    );
  }
  return found;
}

function checkAddedLine({ file, line, text }) {
  const found = [];
  const location = `${file}:${line}`;
  if (hasSecretValue(text)) {
    found.push(violation("SECRET_VALUE", location, "비밀값으로 보이는 값이 있다"));
  }
  if (isTestPath(file)) {
    const title = TEST_TITLE.exec(text);
    if (title && !HANGUL.test(title[2])) {
      found.push(violation("TEST_TITLE_KOREAN", location, "테스트 제목은 한국어로 쓴다"));
    }
    if (FOCUSED_TEST.test(text)) {
      found.push(violation("FOCUSED_TEST", location, ".only로 다른 테스트를 끄지 않는다"));
    }
    return found;
  }
  if (!isSourcePath(file)) return found;
  if (TYPE_ESCAPES.some((pattern) => pattern.test(text))) {
    found.push(violation("TYPE_ESCAPE", location, "as any·as unknown as·@ts-ignore를 새로 쓰지 않는다"));
  }
  if (/eslint-disable/u.test(text) && !/--\s*\S/u.test(text)) {
    found.push(
      violation("LINT_DISABLE_WITHOUT_REASON", location, "eslint-disable에는 '-- 사유'를 붙인다"),
    );
  }
  return found;
}

export function checkStaged({ entries, addedLines, specs, specGaps }) {
  return [
    ...entries.flatMap((entry) => checkEntry(entry, specs)),
    ...addedLines.flatMap(checkAddedLine),
    ...specGaps.map(({ file, missing }) =>
      violation("SPEC_NOT_COVERED", file, `완료 명세인데 테스트가 없는 시나리오: ${missing.join(", ")}`),
    ),
  ];
}

export function checkCommitMessage({ message, entries }) {
  const lines = message.split("\n").filter((line) => !line.startsWith("#"));
  const subject = lines.find((line) => line.trim().length > 0) ?? "";
  if (UNCHECKED_SUBJECT.test(subject)) return [];
  const found = [];
  if (!COMMIT_SUBJECT.test(subject) || !HANGUL.test(subject)) {
    found.push(
      violation(
        "COMMIT_SUBJECT",
        subject,
        "제목은 '유형(범위): 한국어 설명' 형식이다(feat·fix·refactor·perf·test·docs·build·ci·chore·style, 범위는 생략 가능)",
      ),
    );
  }
  if (lines.some((line) => /^TDD-Exempt:\s*\S/u.test(line))) return found;
  const touchesLogic = entries.some(
    (entry) => NEW_OR_CHANGED.has(entry.status) && isTddGuardedPath(entry.path),
  );
  const hasTest = entries.some((entry) => isTestPath(entry.path));
  if (touchesLogic && !hasTest) {
    found.push(
      violation(
        "TDD_PAIRING",
        "커밋",
        "로직(lib·라우트 핸들러·미들웨어)을 바꿨는데 테스트가 없다. 동작이 그대로인 이동·이름 변경이면 본문에 'TDD-Exempt: 사유'를 쓴다",
      ),
    );
  }
  return found;
}

function git(args) {
  return execFileSync("git", ["-C", REPO_ROOT, ...args], {
    encoding: "utf-8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function stagedEntries() {
  return parseNameStatus(git(["diff", "--cached", "--name-status", "-M"]));
}

function completedSpecGaps(entries) {
  const completed = entries
    .filter((entry) => NEW_OR_CHANGED.has(entry.status) && entry.path.startsWith(`${SPEC_DIR}/`))
    .map((entry) => parseSpec(git(["show", `:${entry.path}`]), entry.path))
    .filter((spec) => spec.status === "완료");
  if (completed.length === 0) return [];
  return computeCoverage(completed, collectTestFiles(REPO_ROOT))
    .perSpec.filter(({ missing }) => missing.length > 0)
    .map(({ spec, missing }) => ({ file: spec.file, missing }));
}

function report(violations) {
  if (violations.length === 0) return;
  process.stderr.write(`[커밋 가드] ${violations.length}건을 고쳐야 커밋할 수 있습니다.\n`);
  for (const { code, location, message } of violations) {
    process.stderr.write(`- ${code} ${location}: ${message}\n`);
  }
  process.exit(1);
}

function main() {
  const args = process.argv.slice(2);
  const messageIndex = args.indexOf("--commit-msg");
  if (messageIndex !== -1) {
    const message = fs.readFileSync(args[messageIndex + 1], "utf-8");
    report(checkCommitMessage({ message, entries: stagedEntries() }));
    return;
  }
  const entries = stagedEntries();
  report(
    checkStaged({
      entries,
      addedLines: parseAddedLines(git(["diff", "--cached", "-U0", "--no-color"])),
      specs: loadSpecs(REPO_ROOT),
      specGaps: completedSpecGaps(entries),
    }),
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
