#!/usr/bin/env node

// Claude Code PreToolUse 훅(Edit·Write·MultiEdit). 편집 단계에서 다음을 강제한다.
// - 보호 파일: 비밀값·커밋된 마이그레이션은 고치지 못한다(예외 사유로도 못 푼다)
// - 명세 먼저(SDD): 소스(app/·lib/·middleware.ts)는 승인·현행·완료 명세(docs/specs)의 코드 경로 안에서만 고친다
// - 테스트 먼저(TDD): lib 로직·라우트 핸들러·미들웨어는 관련 테스트가 먼저 바뀌어 있어야 고친다.
//   관련 테스트 = 이름 짝(x.test.ts ↔ x.ts)이거나 그 파일을 덮는 명세의 시나리오 ID가 적힌 테스트
// - 명세 안내: 명세가 덮는 소스를 세션에서 처음 고칠 때 명세별로 한 번 그 명세를 알린다(막지 않음)
// Bash로 고친 파일은 이 훅이 보지 못하므로 커밋 가드(tooling/harness/commit-guard.mjs)가 다시 검사한다.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  EXEMPTION_FILE,
  EXEMPTION_TTL_MS,
  isMigrationPath,
  isSecretPath,
  isSourcePath,
  isTddGuardedPath,
  isTestPath,
  stemOf,
} from "../../tooling/harness/layout.mjs";
import { implementableSpecOf, loadSpecs, specsCovering } from "../../tooling/harness/specs.mjs";

const GUARDED_TOOLS = new Set(["Edit", "Write", "MultiEdit"]);
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function deny(lines) {
  return { allow: false, message: lines.join("\n") };
}

function specFirstDenial(relPath, specs) {
  const drafts = specsCovering(specs, relPath).map((spec) => spec.file);
  if (drafts.length > 0) {
    return deny([
      `[편집 가드] ${relPath}를 덮는 명세(${drafts.join(", ")})가 아직 초안입니다(명세 먼저).`,
      "명세를 사용자에게 보여 주고 명시적 승인을 받아 상태를 승인으로 바꾼 뒤 구현하세요.",
    ]);
  }
  return deny([
    `[편집 가드] ${relPath}를 덮는 승인·현행·완료 명세가 없습니다(명세 먼저).`,
    "- 새 기능이면 spec 스킬로 docs/specs/<기능>.md를 쓰고 사용자 승인(상태: 승인)을 받은 뒤 구현하세요.",
    "- 기존 기능의 파일이면 그 기능 명세의 코드 경로에 이 경로를 더하세요. 명세를 바꾸는 일이라 사용자 승인 대상입니다.",
  ]);
}

export function decideEdit({ relPath, specs, changedTests, exemptionReason, trackedInHead }) {
  if (isSecretPath(relPath)) {
    return deny([
      `[편집 가드] ${relPath}는 비밀값 파일이라 고칠 수 없습니다.`,
      "비밀값은 사용자가 직접 넣습니다. 필요한 변수 이름은 .env.example에 적으세요.",
    ]);
  }
  if (isMigrationPath(relPath) && trackedInHead) {
    return deny([
      `[편집 가드] ${relPath}는 커밋된 마이그레이션입니다. 마이그레이션은 추가만 합니다.`,
      "바꿀 내용은 새 마이그레이션 파일로 쓰세요(INVARIANTS 7).",
    ]);
  }
  if (!isSourcePath(relPath)) return { allow: true };
  const spec = implementableSpecOf(specs, relPath);
  if (!spec) return specFirstDenial(relPath, specs);
  if (!isTddGuardedPath(relPath) || exemptionReason) return { allow: true };

  const scenarioId = new RegExp(`\\b${spec.prefix}-\\d+\\b`, "u");
  const related = changedTests.some(
    (test) => stemOf(test.path) === stemOf(relPath) || scenarioId.test(test.text),
  );
  if (related) return { allow: true };
  return deny([
    `[편집 가드] ${relPath}보다 테스트를 먼저 쓰세요(테스트 먼저).`,
    `- ${stemOf(relPath)}.test.ts를 쓰거나, 제목에 ${spec.prefix} 시나리오 ID를 붙인 테스트를 먼저 쓰고 기대한 이유로 실패하는지 확인한 뒤 구현합니다.`,
    `- 동작이 바뀌지 않는 수정(이동·이름 변경·로그·주석)이면 ${EXEMPTION_FILE}에 사유 한 줄을 쓰고 다시 시도하세요(60분 유효). 사유는 작업 보고에도 적습니다.`,
  ]);
}

export function specNotice({ relPath, specs }) {
  if (!isSourcePath(relPath)) return null;
  const spec = implementableSpecOf(specs, relPath);
  if (!spec) return null;
  return {
    spec: spec.file,
    text: [
      `[명세 안내] ${relPath}의 동작 정본은 ${spec.file}(상태: ${spec.status})입니다.`,
      "- 고치기 전에 이 명세에서 관련 시나리오를 읽으세요.",
      "- 시나리오 결과가 바뀌는 수정이면 멈추고 spec 스킬로 명세를 먼저 고쳐 사용자 승인을 받으세요.",
      "- 명세대로 동작하지 않는 버그 수정이면 그대로 진행하고, 회귀 테스트 제목에 그 시나리오 ID를 붙이세요.",
      "(이 안내는 세션마다 명세별로 한 번 나옵니다.)",
    ].join("\n"),
  };
}

export function parseChangedPaths(porcelain) {
  return porcelain
    .split("\n")
    .filter((line) => line.length > 3)
    .map((line) => {
      const entry = line.slice(3);
      const arrow = entry.indexOf(" -> ");
      return arrow === -1 ? entry : entry.slice(arrow + 4);
    });
}

function git(args) {
  return execFileSync("git", ["-C", REPO_ROOT, ...args], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
  });
}

function readChangedTests() {
  return parseChangedPaths(git(["status", "--porcelain=v1", "-uall"]))
    .filter((relPath) => isTestPath(relPath) && fs.existsSync(path.join(REPO_ROOT, relPath)))
    .map((relPath) => ({ path: relPath, text: fs.readFileSync(path.join(REPO_ROOT, relPath), "utf-8") }));
}

function isTrackedInHead(relPath) {
  try {
    git(["cat-file", "-e", `HEAD:${relPath}`]);
    return true;
  } catch {
    return false;
  }
}

function readExemptionReason() {
  const exemptionPath = path.join(REPO_ROOT, EXEMPTION_FILE);
  if (!fs.existsSync(exemptionPath)) return null;
  if (Date.now() - fs.statSync(exemptionPath).mtimeMs > EXEMPTION_TTL_MS) return null;
  return fs.readFileSync(exemptionPath, "utf-8").trim() || null;
}

// 세션마다 명세별로 한 번만 true를 돌려준다.
function firstNoticeInSession(sessionId, specFile) {
  const dir = path.join(tmpdir(), "myblog-edit-guard", sessionId ?? "no-session");
  const marker = path.join(dir, createHash("sha1").update(specFile).digest("hex"));
  if (fs.existsSync(marker)) return false;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(marker, specFile);
  return true;
}

function main() {
  const input = JSON.parse(fs.readFileSync(0, "utf-8") || "{}");
  const filePath = input.tool_input?.file_path;
  if (!GUARDED_TOOLS.has(input.tool_name) || typeof filePath !== "string") return;

  const relPath = path.relative(REPO_ROOT, path.resolve(filePath)).split(path.sep).join("/");
  if (relPath.startsWith("..") || path.isAbsolute(relPath)) return;

  const specs = loadSpecs(REPO_ROOT);
  const decision = decideEdit({
    relPath,
    specs,
    changedTests: isTddGuardedPath(relPath) ? readChangedTests() : [],
    exemptionReason: readExemptionReason(),
    trackedInHead: isMigrationPath(relPath) && isTrackedInHead(relPath),
  });
  if (!decision.allow) {
    process.stderr.write(`${decision.message}\n`);
    process.exit(2);
  }

  const notice = specNotice({ relPath, specs });
  if (!notice || !firstNoticeInSession(input.session_id, notice.spec)) return;
  // permissionDecision을 넣지 않아 권한 확인 흐름은 그대로 두고 안내만 붙인다.
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: notice.text } }),
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
