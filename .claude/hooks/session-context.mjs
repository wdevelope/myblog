#!/usr/bin/env node

// Claude Code SessionStart 훅. 새 세션·압축 뒤에 진행 위치를 대화 맥락에 넣는다.
// 정본은 docs/plans/roadmap.md와 docs/specs이고, 여기서는 위치만 알려 준다.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ROADMAP } from "../../tooling/harness/layout.mjs";
import { collectTestFiles, computeCoverage, loadSpecs } from "../../tooling/harness/specs.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const IN_PROGRESS = new Set(["초안", "승인"]);

function progressSection(roadmapText) {
  const start = roadmapText.search(/^## .*진행 현황/mu);
  if (start === -1) return "";
  const rest = roadmapText.slice(start).split("\n").slice(1).join("\n");
  const end = rest.search(/^## /mu);
  return end === -1 ? rest : rest.slice(0, end);
}

export function summarizeContext({ roadmapText, specs, missingCount }) {
  if (!roadmapText) return "";
  const nextStage = progressSection(roadmapText)
    .split("\n")
    .find((line) => /^\s*- \[ \]/u.test(line));
  const open = specs.filter((spec) => IN_PROGRESS.has(spec.status));
  return [
    "[myblog 진행 위치]",
    `- 다음 단계: ${nextStage ? nextStage.replace(/^\s*- \[ \]\s*/u, "") : "없음"}`,
    `- 진행 중 명세: ${
      open.length === 0
        ? "없음"
        : open.map((spec) => `${path.posix.basename(spec.file)} (${spec.status})`).join(", ")
    }`,
    `- 테스트 없는 시나리오: ${missingCount}개 (npm run spec:check)`,
    `- 정본: ${ROADMAP}, docs/specs/. 작업 방식은 CLAUDE.md §3(명세 → 테스트 → 구현).`,
  ].join("\n");
}

function main() {
  const roadmapPath = path.join(REPO_ROOT, ROADMAP);
  const roadmapText = fs.existsSync(roadmapPath) ? fs.readFileSync(roadmapPath, "utf-8") : null;
  const specs = loadSpecs(REPO_ROOT);
  const missingCount = computeCoverage(specs, collectTestFiles(REPO_ROOT)).perSpec.reduce(
    (sum, { missing }) => sum + missing.length,
    0,
  );
  const summary = summarizeContext({ roadmapText, specs, missingCount });
  if (summary) process.stdout.write(`${summary}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
