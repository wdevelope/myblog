import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseSpec } from "../../tooling/harness/specs.mjs";
import { decideEdit, parseChangedPaths, specNotice } from "./edit-guard.mjs";

const posts = parseSpec(
  [
    "# 명세: 글",
    "",
    "- **상태:** 현행",
    "- **ID 접두:** POST",
    "- **근거:** 현행 코드 역작성(2026-10-21)",
    "- **코드 경로:** `lib/actions/posts.ts`, `lib/markdown.ts`, `app/_components/PostEditor.tsx`",
    "",
    "### POST-4. 피드 제목이 비면 본문에서 자동 제목을 만든다",
  ].join("\n"),
  "docs/specs/posts.md",
);
const tags = parseSpec(
  [
    "- **상태:** 초안",
    "- **ID 접두:** TAG",
    "- **근거:** 2026-10-21 요청",
    "- **코드 경로:** `lib/actions/tags.ts`",
  ].join("\n"),
  "docs/specs/tags.md",
);

const base = { specs: [posts, tags], changedTests: [], exemptionReason: null, trackedInHead: false };

describe("편집 가드: 보호 파일", () => {
  it("비밀값 파일은 예외 사유가 있어도 막는다", () => {
    const decision = decideEdit({ ...base, relPath: ".env.local", exemptionReason: "이동" });
    assert.equal(decision.allow, false);
    assert.match(decision.message, /비밀값/);
  });

  it("커밋된 마이그레이션은 막고 새 마이그레이션은 둔다", () => {
    const relPath = "supabase/migrations/20260101190000_add_post_view_count.sql";
    assert.equal(decideEdit({ ...base, relPath, trackedInHead: true }).allow, false);
    assert.equal(decideEdit({ ...base, relPath, trackedInHead: false }).allow, true);
  });
});

describe("편집 가드: 명세 먼저(SDD)", () => {
  it("어느 명세도 덮지 않는 소스는 막는다", () => {
    const decision = decideEdit({ ...base, relPath: "app/tags/page.tsx" });
    assert.equal(decision.allow, false);
    assert.match(decision.message, /승인·현행·완료 명세가 없습니다/);
  });

  it("초안 명세만 덮는 소스는 승인을 받으라고 막는다", () => {
    const decision = decideEdit({
      ...base,
      relPath: "lib/actions/tags.ts",
      changedTests: [{ path: "lib/actions/tags.test.ts", text: "" }],
    });
    assert.equal(decision.allow, false);
    assert.match(decision.message, /아직 초안/);
  });

  it("현행 명세가 덮는 화면(.tsx)은 테스트 없이 고칠 수 있다", () => {
    assert.equal(decideEdit({ ...base, relPath: "app/_components/PostEditor.tsx" }).allow, true);
  });

  it("문서·도구·설정 파일은 명세 없이 고칠 수 있다", () => {
    for (const relPath of ["CLAUDE.md", "docs/specs/posts.md", "tooling/harness/layout.mjs", "package.json"]) {
      assert.equal(decideEdit({ ...base, relPath }).allow, true, relPath);
    }
  });
});

describe("편집 가드: 테스트 먼저(TDD)", () => {
  const relPath = "lib/markdown.ts";

  it("관련 테스트가 바뀌지 않았으면 로직 편집을 막는다", () => {
    const decision = decideEdit({
      ...base,
      relPath,
      changedTests: [{ path: "lib/image.test.ts", text: 'it("IMG-1 공개 URL", () => {})' }],
    });
    assert.equal(decision.allow, false);
    assert.match(decision.message, /테스트를 먼저/);
  });

  it("이름 짝 테스트가 바뀌었으면 허용한다", () => {
    const changedTests = [{ path: "lib/markdown.test.ts", text: "" }];
    assert.equal(decideEdit({ ...base, relPath, changedTests }).allow, true);
  });

  it("같은 명세의 시나리오 ID가 적힌 테스트가 바뀌었으면 허용한다", () => {
    const changedTests = [{ path: "tests/posts.test.ts", text: 'it("POST-4 자동 제목", () => {})' }];
    assert.equal(decideEdit({ ...base, relPath, changedTests }).allow, true);
  });

  it("예외 사유가 있으면 테스트 먼저를 건너뛴다", () => {
    assert.equal(decideEdit({ ...base, relPath, exemptionReason: "파일 이동만 한다" }).allow, true);
  });
});

describe("편집 가드: 명세 안내와 git 출력", () => {
  it("명세가 덮는 소스에는 그 명세를 알리고 그 밖에는 알리지 않는다", () => {
    assert.match(specNotice({ relPath: "lib/markdown.ts", specs: base.specs }).text, /docs\/specs\/posts\.md/);
    assert.equal(specNotice({ relPath: "README.md", specs: base.specs }), null);
  });

  it("porcelain 출력에서 이름 변경 뒤 경로를 읽는다", () => {
    assert.deepEqual(parseChangedPaths(" M lib/a.ts\n?? lib/a.test.ts\nR  lib/old.ts -> lib/new.ts\n"), [
      "lib/a.ts",
      "lib/a.test.ts",
      "lib/new.ts",
    ]);
  });
});
