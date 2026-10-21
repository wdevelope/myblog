import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkSpecs, implementableSpecOf, parseSpec } from "./specs.mjs";

function spec({ file = "docs/specs/comments.md", status = "현행", prefix = "CMT", paths, scenarios }) {
  return parseSpec(
    [
      "# 명세: 댓글",
      "",
      `- **상태:** ${status}`,
      `- **ID 접두:** ${prefix}`,
      "- **근거:** 현행 코드 역작성(2026-10-21)",
      `- **코드 경로:** ${paths.map((p) => `\`${p}\``).join(", ")}`,
      "",
      ...scenarios.map((title, index) => `### ${prefix}-${index + 1}. ${title}`),
    ].join("\n"),
    file,
  );
}

const comments = spec({
  paths: ["lib/actions/comments.ts", "app/_components/CommentsThread.tsx"],
  scenarios: ["비로그인은 댓글을 볼 수 없다", "다이어리에는 댓글이 없다"],
});
const statPath = (relPath) => (relPath.includes(".") ? "file" : "dir");
const base = { specs: [comments], testFiles: [], sourcePaths: [], statPath };

describe("명세 파서", () => {
  it("머리말의 상태·접두·근거·코드 경로와 시나리오 ID를 읽는다", () => {
    assert.equal(comments.status, "현행");
    assert.equal(comments.prefix, "CMT");
    assert.deepEqual(comments.paths, ["lib/actions/comments.ts", "app/_components/CommentsThread.tsx"]);
    assert.deepEqual(
      comments.scenarios.map((s) => s.id),
      ["CMT-1", "CMT-2"],
    );
  });

  it("초안 명세는 구현을 허용하지 않고 승인·현행·완료는 허용한다", () => {
    const draft = spec({ status: "초안", paths: ["lib/actions/comments.ts"], scenarios: ["가"] });
    assert.equal(implementableSpecOf([draft], "lib/actions/comments.ts"), null);
    assert.equal(implementableSpecOf([comments], "lib/actions/comments.ts"), comments);
  });

  it("디렉터리 코드 경로는 그 아래 파일을 모두 덮는다", () => {
    const feed = spec({ file: "docs/specs/feed.md", prefix: "FEED", paths: ["app/feed/"], scenarios: ["가"] });
    assert.equal(implementableSpecOf([feed], "app/feed/edit/[slug]/page.tsx"), feed);
    assert.equal(implementableSpecOf([feed], "app/feedback/page.tsx"), null);
  });
});

describe("명세 검사", () => {
  it("명세가 덮지 않는 소스는 문제다", () => {
    const { problems } = checkSpecs({ ...base, sourcePaths: ["lib/actions/posts.ts"] });
    assert.match(problems.join("\n"), /lib\/actions\/posts\.ts: 승인·현행·완료 명세가 덮지 않는다/);
  });

  it("두 명세가 함께 덮는 소스는 문제다", () => {
    const other = spec({
      file: "docs/specs/other.md",
      prefix: "OTH",
      paths: ["lib/actions/comments.ts"],
      scenarios: ["가"],
    });
    const { problems } = checkSpecs({
      ...base,
      specs: [comments, other],
      sourcePaths: ["lib/actions/comments.ts"],
    });
    assert.match(problems.join("\n"), /여러 명세가 함께 덮는다/);
  });

  it("현행 명세의 테스트 없는 시나리오는 보고만 하고 완료 명세는 막는다", () => {
    const current = checkSpecs(base);
    assert.deepEqual(current.problems, []);
    assert.deepEqual(current.coverage.perSpec[0].missing, ["CMT-1", "CMT-2"]);

    const done = spec({ status: "완료", paths: comments.paths, scenarios: ["가", "나"] });
    const { problems } = checkSpecs({
      ...base,
      specs: [done],
      testFiles: [{ path: "lib/actions/comments.test.ts", text: 'it("CMT-1 가", () => {})' }],
    });
    assert.match(problems.join("\n"), /완료 명세인데 테스트 없는 시나리오가 있다 \(CMT-2\)/);
  });

  it("명세에 없는 시나리오 ID를 참조하는 테스트는 문제다", () => {
    const { problems } = checkSpecs({
      ...base,
      testFiles: [{ path: "lib/actions/comments.test.ts", text: 'it("CMT-9 없는 시나리오", () => {})' }],
    });
    assert.match(problems.join("\n"), /명세에 없는 시나리오\(CMT-9\)/);
  });

  it("현행 명세의 코드 경로가 실제로 없거나 디렉터리인데 /로 끝나지 않으면 문제다", () => {
    const broken = spec({ paths: ["lib/actions/gone.ts", "app/feed"], scenarios: ["가"] });
    const { problems } = checkSpecs({
      ...base,
      specs: [broken],
      statPath: (relPath) => (relPath === "app/feed" ? "dir" : null),
    });
    const text = problems.join("\n");
    assert.match(text, /코드 경로\(lib\/actions\/gone\.ts\)가 없다/);
    assert.match(text, /코드 경로\(app\/feed\)는 디렉터리라 \/로 끝내야 한다/);
  });

  it("ID 접두가 겹치거나 시나리오 접두가 다르면 문제다", () => {
    const dup = spec({ file: "docs/specs/dup.md", paths: ["lib/x.ts"], scenarios: ["가"] });
    const wrong = parseSpec(
      ["- **상태:** 현행", "- **ID 접두:** IMG", "- **근거:** x", "- **코드 경로:** `lib/image.ts`", "### CMT-1. 가"].join("\n"),
      "docs/specs/images.md",
    );
    const { problems } = checkSpecs({ ...base, specs: [comments, dup, wrong], statPath: () => "file" });
    const text = problems.join("\n");
    assert.match(text, /ID 접두\(CMT\)를 docs\/specs\/comments\.md도 쓴다/);
    assert.match(text, /시나리오\(CMT-1\)의 접두가 다르다/);
  });
});
