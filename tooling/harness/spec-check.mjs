#!/usr/bin/env node

// 명세 검사(npm run spec:check). 형식, 시나리오 ↔ 테스트 연결, 소스의 명세 소속을 확인한다.
// 실패: 형식 문제, 명세에 없는 시나리오 ID 참조, 완료 명세의 테스트 없는 시나리오,
//       명세가 덮지 않거나 둘 이상이 덮는 소스. 현행·승인 명세의 테스트 없는 시나리오는 보고만 한다(테스트 부채).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { checkSpecs, collectSourcePaths, collectTestFiles, loadSpecs } from "./specs.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function statPath(relPath) {
  const absolute = path.join(REPO_ROOT, relPath);
  if (!fs.existsSync(absolute)) return null;
  return fs.statSync(absolute).isDirectory() ? "dir" : "file";
}

function main() {
  const specs = loadSpecs(REPO_ROOT);
  const { problems, coverage } = checkSpecs({
    specs,
    testFiles: collectTestFiles(REPO_ROOT),
    sourcePaths: collectSourcePaths(REPO_ROOT),
    statPath,
  });

  if (specs.length === 0) process.stdout.write("명세 없음\n");
  let debt = 0;
  for (const { spec, covered, missing } of coverage.perSpec) {
    const total = covered.length + missing.length;
    process.stdout.write(`${spec.file} [${spec.status}] 시나리오 ${covered.length}/${total}\n`);
    if (missing.length > 0) process.stdout.write(`  테스트 없음: ${missing.join(", ")}\n`);
    debt += missing.length;
  }
  process.stdout.write(`\n테스트 없는 시나리오: ${debt}개\n`);

  if (problems.length === 0) return;
  process.stderr.write(`\n[명세 검사] ${problems.length}건\n${problems.map((p) => `- ${p}`).join("\n")}\n`);
  process.exit(1);
}

main();
