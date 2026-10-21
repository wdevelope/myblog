#!/usr/bin/env node

// TDD 하네스 훅.
// - PostToolUse(Edit|Write|MultiEdit): 편집한 소스·테스트를 import 그래프로 커버하는 테스트(vitest related)를 실행하고,
//   실패하면 exit 2로 로그를 Claude에게 돌려준다.
// - Stop: ① 실패가 기록된 테스트만 다시 돌려 아직 실패면 턴 종료를 막는다(한 턴 최대 MAX_STOP_BLOCKS회).
//         ② 관련 테스트가 있는 프로덕션 코드를 고치면서 그 테스트를 건드리지 않았으면 턴당 한 번 막아
//            회귀 테스트 추가나 생략 사유를 요구한다.
// 상태는 세션별 임시 디렉터리에 항목당 파일 하나로 기록해 병렬 편집 간 쓰기 경합을 피하고, 종료가 허용되면 비운다.

import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isSourcePath, isTestPath } from "../../tooling/harness/layout.mjs";

const OUTPUT_TAIL_LINES = 80;
const MAX_STOP_BLOCKS = 3;

const root =
  process.env.CLAUDE_PROJECT_DIR ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const input = JSON.parse(readFileSync(0, "utf8") || "{}");
const stateDir = path.join(tmpdir(), "myblog-tdd", input.session_id ?? "no-session");
const redDir = path.join(stateDir, "red");
const prodDir = path.join(stateDir, "prod");
const testDir = path.join(stateDir, "test");
const blocksFile = path.join(stateDir, "blocks");
const nudgedFile = path.join(stateDir, "nudged");

const hash = (text) => createHash("sha1").update(text).digest("hex");

function writeEntry(dir, key, value) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, hash(key)), JSON.stringify(value));
}

function readEntries(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).map((name) => ({
    entryFile: path.join(dir, name),
    ...JSON.parse(readFileSync(path.join(dir, name), "utf8")),
  }));
}

// targets(소스·테스트 파일)를 커버하는 테스트를 실행한다. 테스트 파일 자체를 넘기면 그 파일만 실행된다.
function runRelated(targets) {
  mkdirSync(stateDir, { recursive: true });
  const reportFile = path.join(stateDir, `report-${randomUUID()}.json`);
  const result = spawnSync(
    path.join(root, "node_modules/.bin/vitest"),
    [
      "related",
      ...targets.map((t) => path.join(root, t)),
      "--run",
      "--passWithNoTests",
      "--reporter=default",
      "--reporter=json",
      `--outputFile.json=${reportFile}`,
    ],
    // 공용 모듈을 고치면 연관 테스트 출력이 기본 한도(1MB)를 넘어 ENOBUFS로 통과도 실패로 기록되므로 한도를 넉넉히 둔다.
    {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
    },
  );
  let tests = [];
  if (existsSync(reportFile)) {
    tests = JSON.parse(readFileSync(reportFile, "utf8")).testResults.map((t) => ({
      file: path.relative(root, t.name),
      failed: t.status === "failed",
    }));
    rmSync(reportFile);
  }
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}${result.error ?? ""}`
    .trim()
    .split("\n")
    .filter((line) => !line.startsWith("JSON report written to"))
    .slice(-OUTPUT_TAIL_LINES)
    .join("\n");
  return { ok: result.status === 0, tests, output };
}

function onEdit() {
  const filePath = input.tool_input?.file_path;
  if (typeof filePath !== "string") return;
  const rel = path.relative(root, filePath).split(path.sep).join("/");
  const isTest = isTestPath(rel) && /\.[cm]?[jt]sx?$/u.test(rel) && !rel.startsWith("tooling/");
  if ((!isTest && !isSourcePath(rel)) || rel.startsWith("..") || !existsSync(path.join(root, rel))) return;
  if (isTest) writeEntry(testDir, rel, { test: rel });

  const run = runRelated([rel]);
  for (const test of run.tests) {
    if (test.failed) writeEntry(redDir, test.file, { target: test.file });
    else rmSync(path.join(redDir, hash(test.file)), { force: true });
  }
  // 리포트가 없거나 파일 단위 실패 없이 실패했다면(설정·수집 오류) 편집 파일 기준으로 기록한다.
  if (run.ok) rmSync(path.join(redDir, hash(rel)), { force: true });
  else if (!run.tests.some((t) => t.failed)) writeEntry(redDir, rel, { target: rel });

  const covering = run.tests.map((t) => t.file);
  if (!isTest && covering.length > 0) writeEntry(prodDir, rel, { file: rel, tests: covering });

  if (run.ok) return;
  process.stderr.write(
    `[TDD 피드백] ${rel} 편집 후 관련 테스트 실패 (${run.tests.length}개 파일 실행). Red 단계의 의도된 실패면 구현으로 통과시키고, 회귀면 원인을 고쳐라. 테스트 기대값을 바꿔 통과시키지 마라. 통과시키기 전에는 턴을 끝낼 수 없다:\n${run.output}\n`,
  );
  process.exit(2);
}

// 기록된 실패 대상을 다시 돌려 통과하면 기록을 지우고, 여전히 실패면 보고 문자열을 돌려준다.
function recheckFailures() {
  const entries = readEntries(redDir).filter((entry) => {
    if (existsSync(path.join(root, entry.target))) return true;
    rmSync(entry.entryFile);
    return false;
  });
  if (entries.length === 0) return [];
  const run = runRelated(entries.map((e) => e.target));
  if (run.ok) {
    entries.forEach((e) => rmSync(e.entryFile));
    return [];
  }
  return [`■ ${entries.map((e) => e.target).join(", ")}\n${run.output}`];
}

// 편집 당시 import 그래프로 찾은 관련 테스트를 하나도 편집하지 않은 프로덕션 파일.
function untestedFiles() {
  const tests = new Set(readEntries(testDir).map((e) => e.test));
  return readEntries(prodDir).filter((p) => !p.tests.some((t) => tests.has(t)));
}

function block(message) {
  process.stderr.write(`[TDD 게이트] ${message}\n`);
  process.exit(2);
}

function onStop() {
  if (!existsSync(stateDir)) return;
  // stop_hook_active가 false면 이번 턴의 첫 종료 시도이므로 차단 횟수·확인 여부를 새로 센다.
  const active = input.stop_hook_active;
  const blocks = active && existsSync(blocksFile) ? Number(readFileSync(blocksFile, "utf8")) : 0;
  // 마지막 차단에서 사용자 보고를 지시했으므로 기록을 비우고 종료를 허용한다.
  if (blocks >= MAX_STOP_BLOCKS) return rmSync(stateDir, { recursive: true });

  const failures = recheckFailures();
  if (failures.length > 0) {
    writeFileSync(blocksFile, String(blocks + 1));
    const lastNotice =
      blocks + 1 === MAX_STOP_BLOCKS
        ? "\n이번이 마지막 차단이다. 고칠 수 없다면 원인과 남은 실패 테스트를 사용자에게 보고하고 종료하라."
        : "";
    return block(
      `실패한 테스트가 남아 있어 턴을 끝낼 수 없다 (${blocks + 1}/${MAX_STOP_BLOCKS}). 테스트 기대값이 아니라 구현을 고쳐 통과시킨 뒤 종료하라.${lastNotice}\n\n${failures.join("\n\n")}`,
    );
  }

  const untested = untestedFiles();
  const nudged = active && existsSync(nudgedFile);
  if (untested.length === 0 || nudged) return rmSync(stateDir, { recursive: true });

  writeFileSync(nudgedFile, "");
  const list = untested
    .map((p) => `  - ${p.file} (관련 테스트: ${p.tests.map((t) => path.basename(t)).join(", ")})`)
    .join("\n");
  return block(
    `테스트 변경 없이 프로덕션 코드만 수정됐다:\n${list}\n\n버그 수정·기능 추가라면 이 변경을 검증하는 회귀 테스트를 추가하라(CLAUDE.md §3). 리팩토링·타입·문구 수정처럼 테스트가 불필요하면 그 사유를 사용자에게 밝히고 종료하라. 이 확인은 이번 턴에 한 번만 한다.`,
  );
}

if (input.hook_event_name === "Stop") onStop();
else onEdit();
