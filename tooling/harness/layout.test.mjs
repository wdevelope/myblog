import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isMigrationPath,
  isSecretPath,
  isSourcePath,
  isTddGuardedPath,
  isTestPath,
  stemOf,
} from "./layout.mjs";

describe("경로 규칙: 소스", () => {
  it("app·lib의 TS 파일과 루트 미들웨어는 소스다", () => {
    for (const relPath of [
      "app/page.tsx",
      "app/api/images/route.ts",
      "lib/actions/posts.ts",
      "middleware.ts",
      "proxy.ts",
    ]) {
      assert.equal(isSourcePath(relPath), true, relPath);
    }
  });

  it("테스트·선언·설정·문서·도구 파일은 소스가 아니다", () => {
    for (const relPath of [
      "lib/markdown.test.ts",
      "app/__tests__/page.tsx",
      "next-env.d.ts",
      "next.config.ts",
      "vitest.config.mts",
      "docs/specs/posts.md",
      "tooling/harness/layout.mjs",
      "app/globals.css",
    ]) {
      assert.equal(isSourcePath(relPath), false, relPath);
    }
  });
});

describe("경로 규칙: 테스트 먼저 대상", () => {
  it("lib 로직·라우트 핸들러·미들웨어는 테스트를 먼저 써야 한다", () => {
    for (const relPath of [
      "lib/actions/comments.ts",
      "lib/server/admin.ts",
      "lib/markdown.ts",
      "app/api/images/route.ts",
      "app/auth/callback/route.ts",
      "middleware.ts",
    ]) {
      assert.equal(isTddGuardedPath(relPath), true, relPath);
    }
  });

  it("화면·타입·상수·Supabase 클라이언트 배선은 테스트 먼저 대상이 아니다", () => {
    for (const relPath of [
      "app/article/page.tsx",
      "app/_components/PostEditor.tsx",
      "app/sitemap.ts",
      "lib/types.ts",
      "lib/constants.ts",
      "lib/supabase/server.ts",
    ]) {
      assert.equal(isTddGuardedPath(relPath), false, relPath);
    }
  });
});

describe("경로 규칙: 보호 파일과 테스트", () => {
  it(".env 계열은 비밀값 파일이고 .env.example은 아니다", () => {
    assert.equal(isSecretPath(".env"), true);
    assert.equal(isSecretPath(".env.local"), true);
    assert.equal(isSecretPath("certs/server.pem"), true);
    assert.equal(isSecretPath(".env.example"), false);
  });

  it("supabase/migrations의 SQL만 마이그레이션이다", () => {
    assert.equal(isMigrationPath("supabase/migrations/20260101190000_add_post_view_count.sql"), true);
    assert.equal(isMigrationPath("supabase/seed.sql"), false);
  });

  it("test 표식이나 테스트 폴더가 있으면 테스트 파일이다", () => {
    assert.equal(isTestPath("lib/image.test.ts"), true);
    assert.equal(isTestPath("app/_components/PostImages.spec.tsx"), true);
    assert.equal(isTestPath("tests/posts.ts"), true);
    assert.equal(isTestPath("lib/image.ts"), false);
  });

  it("테스트와 소스의 짝 이름은 test 표식과 확장자를 뗀 이름이다", () => {
    assert.equal(stemOf("lib/image.test.ts"), "image");
    assert.equal(stemOf("lib/image.ts"), "image");
    assert.equal(stemOf("app/_components/PostImages.spec.tsx"), "PostImages");
  });
});
