// 저장소 경로 규칙. 편집 가드(.claude/hooks)와 커밋 가드·명세 검사(tooling/harness)가 같은 규칙을 쓴다.

import path from "node:path";

export const SPEC_DIR = "docs/specs";
export const ROADMAP = "docs/plans/roadmap.md";
export const EXEMPTION_FILE = ".claude/guard-exempt.local";
export const EXEMPTION_TTL_MS = 60 * 60 * 1000;

const SOURCE_DIRS = ["app/", "lib/"];
// Next 16에서 middleware.ts가 proxy.ts로 바뀌는 중이라 둘 다 소스로 본다.
const ROOT_SOURCE_FILES = new Set(["middleware.ts", "proxy.ts"]);
const CODE_FILE = /\.[cm]?[jt]sx?$/u;
const TEST_DIRS = new Set(["test", "tests", "__tests__"]);
// Supabase 클라이언트 생성은 SDK를 감싼 배선이라, 타입·상수 파일은 로직이 없어 테스트 먼저 대상에서 뺀다.
const TDD_EXCLUDED_PREFIXES = ["lib/supabase/"];
const TDD_EXCLUDED_FILES = new Set(["lib/types.ts", "lib/constants.ts"]);
const MIGRATIONS_DIR = "supabase/migrations/";
const SECRET_FILE_PATTERNS = [/^\.env(?:\..+)?$/u, /\.(?:pem|key|p8|p12|jks|keystore)$/u];

export function isTestPath(relPath) {
  if (relPath.split("/").some((segment) => TEST_DIRS.has(segment))) return true;
  return /\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(relPath);
}

export function isSourcePath(relPath) {
  const inSourceDir =
    SOURCE_DIRS.some((dir) => relPath.startsWith(dir)) || ROOT_SOURCE_FILES.has(relPath);
  if (!inSourceDir || !CODE_FILE.test(relPath) || relPath.endsWith(".d.ts")) return false;
  return !isTestPath(relPath);
}

// 테스트 먼저(TDD) 대상: lib의 .ts 로직, 라우트 핸들러, 미들웨어. 화면(.tsx)은 실용적 TDD라 제외한다.
export function isTddGuardedPath(relPath) {
  if (!isSourcePath(relPath)) return false;
  if (ROOT_SOURCE_FILES.has(relPath)) return true;
  if (relPath.startsWith("app/")) return /\/route\.ts$/u.test(relPath);
  if (!relPath.endsWith(".ts") || TDD_EXCLUDED_FILES.has(relPath)) return false;
  return !TDD_EXCLUDED_PREFIXES.some((prefix) => relPath.startsWith(prefix));
}

export function isSecretPath(relPath) {
  const fileName = path.posix.basename(relPath);
  if (fileName === ".env.example") return false;
  return SECRET_FILE_PATTERNS.some((pattern) => pattern.test(fileName));
}

export function isMigrationPath(relPath) {
  return relPath.startsWith(MIGRATIONS_DIR) && relPath.endsWith(".sql");
}

// 테스트 파일 x.test.ts와 소스 x.ts처럼 확장자·test 표식을 뗀 이름이 같으면 짝으로 본다.
export function stemOf(relPath) {
  return path.posix.basename(relPath).replace(/(?:\.(?:test|spec))?\.[cm]?[jt]sx?$/u, "");
}
