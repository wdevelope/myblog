import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { hasLocalMatch } from "next/dist/shared/lib/match-local-pattern";
import { hasRemoteMatch } from "next/dist/shared/lib/match-remote-pattern";
import { avatarSrc } from "@/lib/avatar";
import { coverSrcFromImageKey } from "@/lib/image";

const SUPABASE_URL = "https://project.supabase.co";

// 호스트는 설정 파일을 읽는 순간 환경 변수로 정해지므로 매번 새로 읽는다.
async function imagePatterns() {
  vi.resetModules();
  const { default: config } = await import("./next.config");
  const { localPatterns, remotePatterns = [] } = config(PHASE_PRODUCTION_BUILD).images ?? {};
  return {
    allowsLocal: (src: string) => hasLocalMatch(localPatterns, src),
    allowsRemote: (src: string) => hasRemoteMatch([], remotePatterns, new URL(src)),
  };
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function headersFor(path: string) {
  vi.resetModules();
  const { default: config } = await import("./next.config");
  const rules = (await config(PHASE_PRODUCTION_BUILD).headers?.()) ?? [];
  const matched = rules.filter((rule) => new RegExp(`^${rule.source.replace("/:path*", "(?:/.*)?")}$`).test(path));
  return new Map(matched.flatMap((rule) => rule.headers.map((h) => [h.key.toLowerCase(), h.value] as const)));
}

describe("보안 응답 헤더", () => {
  it("모든 경로에서 다른 사이트가 iframe으로 띄우지 못하게 한다", async () => {
    for (const path of ["/", "/mypage", "/api/images"]) {
      const headers = await headersFor(path);
      expect(headers.get("x-frame-options")).toBe("DENY");
      expect(headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    }
  });

  it("MIME 추측·리퍼러 전체 주소·플러그인·base 태그 바꾸기를 막는다", async () => {
    const headers = await headersFor("/article/post-1");
    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    const csp = headers.get("content-security-policy") ?? "";
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it("Next.js를 쓴다는 헤더를 내보내지 않는다", async () => {
    vi.resetModules();
    const { default: config } = await import("./next.config");
    expect(config(PHASE_PRODUCTION_BUILD).poweredByHeader).toBe(false);
  });
});

describe("이미지 변환 허용 범위", () => {
  it("화면이 쓰는 정적 이미지는 받는다", async () => {
    const { allowsLocal } = await imagePatterns();

    for (const src of ["/hero.jpg", "/logo.png", "/site-logo.png"]) {
      expect(allowsLocal(src)).toBe(true);
    }
  });

  it("쿼리가 붙은 로컬 주소는 받지 않는다", async () => {
    const { allowsLocal } = await imagePatterns();

    expect(allowsLocal("/hero.jpg?v=1")).toBe(false);
    expect(allowsLocal(coverSrcFromImageKey("post-images-private:2026-01-01/a.png"))).toBe(false);
  });

  it("공개 표지와 프로필 사진 주소는 받는다", async () => {
    const { allowsRemote } = await imagePatterns();

    expect(allowsRemote(coverSrcFromImageKey("post-images-public:2026-01-01/a.png"))).toBe(true);
    expect(allowsRemote(coverSrcFromImageKey("post-images-public:옛 업로드/사진 (1).png"))).toBe(true);
    expect(allowsRemote(avatarSrc("u1/a.jpg") ?? "")).toBe(true);
  });

  it("다른 Supabase 프로젝트의 주소는 받지 않는다", async () => {
    const { allowsRemote } = await imagePatterns();

    expect(allowsRemote("https://other.supabase.co/storage/v1/object/public/post-images-public/a.png")).toBe(false);
  });

  it("내 프로젝트라도 쿼리가 붙거나 공개 저장소 밖이면 받지 않는다", async () => {
    const { allowsRemote } = await imagePatterns();

    expect(allowsRemote(`${SUPABASE_URL}/storage/v1/object/public/post-images-public/a.png?v=1`)).toBe(false);
    expect(allowsRemote(`${SUPABASE_URL}/rest/v1/posts`)).toBe(false);
  });
});
