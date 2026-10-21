import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { summarizeContext } from "./session-context.mjs";

const roadmapText = [
  "# 로드맵",
  "",
  "## 진행 현황",
  "",
  "- [x] 0. 하네스 기본 세팅",
  "- [ ] 1. 관리자 판정 보안 수정",
  "- [ ] 2. MongoDB 전환",
  "",
  "## 발견 사항",
  "- [ ] 섞이면 안 되는 항목",
].join("\n");

describe("세션 맥락", () => {
  it("진행 현황의 첫 미완료 단계와 진행 중 명세, 테스트 부채를 알린다", () => {
    const summary = summarizeContext({
      roadmapText,
      specs: [
        { file: "docs/specs/posts.md", status: "현행" },
        { file: "docs/specs/mongodb.md", status: "초안" },
      ],
      missingCount: 42,
    });
    assert.match(summary, /다음 단계: 1\. 관리자 판정 보안 수정/);
    assert.match(summary, /진행 중 명세: mongodb\.md \(초안\)/);
    assert.match(summary, /테스트 없는 시나리오: 42개/);
  });

  it("로드맵이 없으면 아무것도 알리지 않는다", () => {
    assert.equal(summarizeContext({ roadmapText: null, specs: [], missingCount: 0 }), "");
  });

  it("남은 단계와 진행 중 명세가 없으면 없음으로 알린다", () => {
    const summary = summarizeContext({
      roadmapText: "## 진행 현황\n- [x] 0. 끝",
      specs: [{ file: "docs/specs/posts.md", status: "완료" }],
      missingCount: 0,
    });
    assert.match(summary, /다음 단계: 없음/);
    assert.match(summary, /진행 중 명세: 없음/);
  });
});
