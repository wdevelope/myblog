import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  checkCommitMessage,
  checkStaged,
  parseAddedLines,
  parseNameStatus,
} from "./commit-guard.mjs";
import { parseSpec } from "./specs.mjs";

const posts = parseSpec(
  [
    "- **상태:** 현행",
    "- **ID 접두:** POST",
    "- **근거:** 현행 코드 역작성(2026-10-21)",
    "- **코드 경로:** `lib/actions/posts.ts`, `lib/markdown.ts`",
    "### POST-1. 관리자가 아니면 글을 쓸 수 없다",
  ].join("\n"),
  "docs/specs/posts.md",
);
const base = { entries: [], addedLines: [], specs: [posts], specGaps: [] };
const codes = (violations) => violations.map((v) => v.code);

describe("커밋 가드: 파일", () => {
  it("비밀값 파일을 추가하면 막는다", () => {
    const found = checkStaged({ ...base, entries: [{ status: "A", path: ".env.local", oldPath: null }] });
    assert.deepEqual(codes(found), ["SECRET_FILE"]);
  });

  it("커밋된 마이그레이션을 고치거나 지우면 막고 새로 추가하면 둔다", () => {
    const migration = "supabase/migrations/20260101190000_add_post_view_count.sql";
    assert.deepEqual(codes(checkStaged({ ...base, entries: [{ status: "M", path: migration }] })), [
      "MIGRATION_APPEND_ONLY",
    ]);
    assert.deepEqual(codes(checkStaged({ ...base, entries: [{ status: "D", path: migration }] })), [
      "MIGRATION_APPEND_ONLY",
    ]);
    assert.deepEqual(
      checkStaged({ ...base, entries: [{ status: "A", path: "supabase/migrations/20261021000000_new.sql" }] }),
      [],
    );
  });

  it("명세가 덮지 않는 소스는 막는다", () => {
    const found = checkStaged({ ...base, entries: [{ status: "A", path: "lib/actions/tags.ts" }] });
    assert.deepEqual(codes(found), ["SPEC_REQUIRED"]);
    assert.deepEqual(checkStaged({ ...base, entries: [{ status: "M", path: "lib/markdown.ts" }] }), []);
  });
});

// 이 파일도 커밋 가드를 거치므로 걸리는 문자열(영어 테스트 제목·.only·비밀값)은 조각을 이어 만든다.
const testCall = (fn, title) => `${fn}("${title}", () => {`;
const ONLY = ["it", "only"].join(".");

describe("커밋 가드: 추가된 줄", () => {
  const added = (file, text) => checkStaged({ ...base, addedLines: [{ file, line: 1, text }] });

  it("테스트 제목이 한국어가 아니거나 .only면 막는다", () => {
    assert.deepEqual(codes(added("lib/markdown.test.ts", testCall("it", "strips tags"))), [
      "TEST_TITLE_KOREAN",
    ]);
    assert.deepEqual(codes(added("lib/markdown.test.ts", testCall(ONLY, "POST-5 태그를 지운다"))), [
      "FOCUSED_TEST",
    ]);
    assert.deepEqual(added("lib/markdown.test.ts", testCall("it", "POST-5 태그를 지운다")), []);
  });

  it("소스에 타입 우회와 사유 없는 eslint-disable을 새로 쓰면 막는다", () => {
    assert.deepEqual(codes(added("lib/markdown.ts", "const user = data as any;")), ["TYPE_ESCAPE"]);
    assert.deepEqual(codes(added("lib/markdown.ts", "// eslint-disable-next-line no-console")), [
      "LINT_DISABLE_WITHOUT_REASON",
    ]);
    assert.deepEqual(added("lib/markdown.ts", "// eslint-disable-next-line no-console -- 디버그 출력"), []);
  });

  it("JWT·Supabase 비밀 키·외부 DB 접속 비밀번호를 막고 자리표시자는 둔다", () => {
    const jwt = ["eyJhbGciOiJIUzI1NiJ9", "eyJyb2xlIjoic2VydmljZV9yb2xlIn0", "abcdefghijklmnop"].join(".");
    assert.deepEqual(codes(added("lib/x.ts", `const key = "${jwt}";`)), ["SECRET_VALUE"]);
    const secretKey = ["sb", "secret", "abcdefghijklmn"].join("_");
    assert.deepEqual(codes(added("README.md", `SUPABASE_SERVICE_ROLE_KEY=${secretKey}`)), ["SECRET_VALUE"]);
    const mongoUrl = ["mongodb+srv://blog:s3cret", "cluster0.example.net/db"].join("@");
    assert.deepEqual(codes(added("README.md", mongoUrl)), ["SECRET_VALUE"]);
    assert.deepEqual(added("README.md", "mongodb+srv://blog:<password>@cluster0.example.net/db"), []);
    assert.deepEqual(added("README.md", "mongodb://blog:blog@localhost:27017/blog_test"), []);
  });
});

describe("커밋 가드: 메시지", () => {
  const logic = [{ status: "M", path: "lib/markdown.ts" }];

  it("제목은 유형(범위): 한국어 설명 형식이다", () => {
    assert.deepEqual(checkCommitMessage({ message: "feat: 피드 자동 제목 개선", entries: [] }), []);
    assert.deepEqual(checkCommitMessage({ message: "fix(auth): 관리자 판정 수정", entries: [] }), []);
    assert.deepEqual(codes(checkCommitMessage({ message: "update stuff", entries: [] })), ["COMMIT_SUBJECT"]);
    assert.deepEqual(codes(checkCommitMessage({ message: "feat: add feed", entries: [] })), ["COMMIT_SUBJECT"]);
  });

  it("로직을 바꾼 커밋에 테스트가 없으면 막고 TDD-Exempt 사유가 있으면 둔다", () => {
    assert.deepEqual(codes(checkCommitMessage({ message: "refactor: 요약 함수 정리", entries: logic })), [
      "TDD_PAIRING",
    ]);
    assert.deepEqual(
      checkCommitMessage({
        message: "refactor: 요약 함수 정리\n\nTDD-Exempt: 이름만 바꿨다",
        entries: logic,
      }),
      [],
    );
    assert.deepEqual(
      checkCommitMessage({
        message: "fix: 요약 함수 수정",
        entries: [...logic, { status: "M", path: "lib/markdown.test.ts" }],
      }),
      [],
    );
  });

  it("화면만 바꾼 커밋은 테스트 짝을 요구하지 않는다", () => {
    assert.deepEqual(
      checkCommitMessage({ message: "style: 카드 여백 조정", entries: [{ status: "M", path: "app/page.tsx" }] }),
      [],
    );
  });
});

describe("커밋 가드: git 출력 파서", () => {
  it("이름 변경을 포함한 name-status를 읽는다", () => {
    assert.deepEqual(parseNameStatus("M\tlib/a.ts\nR100\tlib/old.ts\tlib/new.ts\n"), [
      { status: "M", path: "lib/a.ts", oldPath: null },
      { status: "R", path: "lib/new.ts", oldPath: "lib/old.ts" },
    ]);
  });

  it("diff에서 추가된 줄과 줄 번호를 읽는다", () => {
    const diff = ["+++ b/lib/a.ts", "@@ -1,0 +3,2 @@", "+one", "+two"].join("\n");
    assert.deepEqual(parseAddedLines(diff), [
      { file: "lib/a.ts", line: 3, text: "one" },
      { file: "lib/a.ts", line: 4, text: "two" },
    ]);
  });
});
