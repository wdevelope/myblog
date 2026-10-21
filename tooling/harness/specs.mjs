// 명세(docs/specs/*.md) 파서와 검사. 명세 형식은 docs/specs/_template.md가 정본이다.

import fs from "node:fs";
import path from "node:path";

import { SPEC_DIR, isSourcePath, isTestPath } from "./layout.mjs";

const STATUSES = new Set(["초안", "승인", "현행", "완료"]);
export const IMPLEMENTABLE_STATUSES = new Set(["승인", "현행", "완료"]);
const WALKED_DIRS = ["app", "lib", "tests"];
const CODE_FILE = /\.[cm]?[jt]sx?$/u;

function headerValue(text, label) {
  const match = new RegExp(`^- \\*\\*${label}:\\*\\*[ \\t]*(.*)$`, "mu").exec(text);
  return match ? match[1].trim() : "";
}

export function parseSpec(text, file) {
  return {
    file,
    status: headerValue(text, "상태").split(/\s/u)[0] ?? "",
    prefix: headerValue(text, "ID 접두"),
    basis: headerValue(text, "근거"),
    paths: [...headerValue(text, "코드 경로").matchAll(/`([^`]+)`/gu)].map(([, value]) => value),
    scenarios: [...text.matchAll(/^###\s+([A-Z][A-Z0-9]*-\d+)\.\s+(.+)$/gmu)].map(
      ([, id, title]) => ({ id, title: title.trim() }),
    ),
  };
}

export function loadSpecs(repoRoot) {
  const dir = path.join(repoRoot, SPEC_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_"))
    .sort()
    .map((name) =>
      parseSpec(fs.readFileSync(path.join(dir, name), "utf-8"), `${SPEC_DIR}/${name}`),
    );
}

const covers = (specPath, relPath) =>
  specPath.endsWith("/") ? relPath.startsWith(specPath) : relPath === specPath;

export function specsCovering(specs, relPath) {
  return specs.filter((spec) => spec.paths.some((specPath) => covers(specPath, relPath)));
}

export function implementableSpecOf(specs, relPath) {
  return (
    specsCovering(specs, relPath).find((spec) => IMPLEMENTABLE_STATUSES.has(spec.status)) ?? null
  );
}

// statPath(relPath): 'file' | 'dir' | null
export function validateSpecs(specs, statPath) {
  const problems = [];
  const owners = new Map();
  for (const spec of specs) {
    if (!STATUSES.has(spec.status)) {
      problems.push(`${spec.file}: 상태는 초안·승인·현행·완료 중 하나다`);
    }
    if (!/^[A-Z][A-Z0-9]*$/u.test(spec.prefix)) problems.push(`${spec.file}: ID 접두가 없다`);
    if (!spec.basis) problems.push(`${spec.file}: 근거가 없다`);
    if (spec.paths.length === 0) problems.push(`${spec.file}: 코드 경로가 없다`);
    // 초안·승인은 아직 만들지 않은 경로를 적을 수 있다.
    if (spec.status === "현행" || spec.status === "완료") {
      for (const specPath of spec.paths) {
        const kind = statPath(specPath.replace(/\/$/u, ""));
        if (!kind) problems.push(`${spec.file}: 코드 경로(${specPath})가 없다`);
        else if (kind === "dir" && !specPath.endsWith("/")) {
          problems.push(`${spec.file}: 코드 경로(${specPath})는 디렉터리라 /로 끝내야 한다`);
        }
      }
    }
    const seen = new Set();
    for (const { id } of spec.scenarios) {
      if (!id.startsWith(`${spec.prefix}-`)) problems.push(`${spec.file}: 시나리오(${id})의 접두가 다르다`);
      else if (seen.has(id)) problems.push(`${spec.file}: 시나리오(${id})가 겹친다`);
      seen.add(id);
    }
    if (owners.has(spec.prefix)) {
      problems.push(`${spec.file}: ID 접두(${spec.prefix})를 ${owners.get(spec.prefix)}도 쓴다`);
    } else owners.set(spec.prefix, spec.file);
  }
  return problems;
}

export function computeCoverage(specs, testFiles) {
  const idsByPrefix = new Map(
    specs.map((spec) => [spec.prefix, new Set(spec.scenarios.map((s) => s.id))]),
  );
  const referenced = new Set();
  const unknownReferences = [];
  for (const { path: filePath, text } of testFiles) {
    for (const [id, prefix] of text.matchAll(/\b([A-Z][A-Z0-9]*)-\d+\b/gu)) {
      const ids = idsByPrefix.get(prefix);
      if (!ids) continue;
      if (ids.has(id)) referenced.add(id);
      else unknownReferences.push({ path: filePath, id });
    }
  }
  const perSpec = specs.map((spec) => {
    const ids = spec.scenarios.map((s) => s.id);
    return {
      spec,
      covered: ids.filter((id) => referenced.has(id)),
      missing: ids.filter((id) => !referenced.has(id)),
    };
  });
  return { perSpec, unknownReferences };
}

// 소스 하나는 구현 가능한 명세(승인·현행·완료) 정확히 하나가 덮는다. 함께 쓰는 파일은 다른 명세의 §8에 적는다.
export function checkSpecs({ specs, testFiles, sourcePaths, statPath }) {
  const problems = validateSpecs(specs, statPath);
  const coverage = computeCoverage(specs, testFiles);
  for (const { spec, missing } of coverage.perSpec) {
    if (spec.status === "완료" && missing.length > 0) {
      problems.push(`${spec.file}: 완료 명세인데 테스트 없는 시나리오가 있다 (${missing.join(", ")})`);
    }
  }
  for (const { path: filePath, id } of coverage.unknownReferences) {
    problems.push(`${filePath}: 명세에 없는 시나리오(${id})를 참조한다`);
  }
  const implementable = specs.filter((spec) => IMPLEMENTABLE_STATUSES.has(spec.status));
  for (const relPath of sourcePaths) {
    const owners = specsCovering(implementable, relPath).map((spec) => spec.file);
    if (owners.length > 1) problems.push(`${relPath}: 여러 명세가 함께 덮는다 (${owners.join(", ")})`);
    if (owners.length === 0) problems.push(`${relPath}: 승인·현행·완료 명세가 덮지 않는다`);
  }
  return { problems, coverage };
}

function walkCodeFiles(repoRoot, relDir, found) {
  const absoluteDir = path.join(repoRoot, relDir);
  if (!fs.existsSync(absoluteDir)) return found;
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const relPath = `${relDir}/${entry.name}`;
    if (entry.isDirectory()) walkCodeFiles(repoRoot, relPath, found);
    else if (CODE_FILE.test(entry.name)) found.push(relPath);
  }
  return found;
}

export function collectCodeFiles(repoRoot) {
  const rootFiles = fs
    .readdirSync(repoRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && CODE_FILE.test(entry.name))
    .map((entry) => entry.name);
  return WALKED_DIRS.reduce((found, dir) => walkCodeFiles(repoRoot, dir, found), rootFiles);
}

export function collectTestFiles(repoRoot) {
  return collectCodeFiles(repoRoot)
    .filter(isTestPath)
    .map((relPath) => ({
      path: relPath,
      text: fs.readFileSync(path.join(repoRoot, relPath), "utf-8"),
    }));
}

export function collectSourcePaths(repoRoot) {
  return collectCodeFiles(repoRoot).filter(isSourcePath);
}
