import { afterEach, describe, expect, it, vi } from "vitest";
import { coverSrcFromImageKey } from "@/lib/image";

const SUPABASE_URL = "https://project.supabase.co";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("이미지 키 → 화면 주소", () => {
  it("공개 버킷 키는 경로의 /를 살린 Supabase 공개 URL이 된다", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
    expect(coverSrcFromImageKey("post-images-public:2026-01-01/a b.png")).toBe(
      `${SUPABASE_URL}/storage/v1/object/public/post-images-public/2026-01-01/a%20b.png`,
    );
  });

  it("비공개 버킷 키는 서버 프록시 경로가 된다", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
    expect(coverSrcFromImageKey("post-images-private:2026-01-01/a.png")).toBe(
      "/api/images?bucket=post-images-private&path=2026-01-01%2Fa.png",
    );
  });

  it("Supabase URL이 없으면 공개 버킷 키도 프록시 경로가 된다", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(coverSrcFromImageKey("post-images-public:2026-01-01/a.png")).toBe(
      "/api/images?bucket=post-images-public&path=2026-01-01%2Fa.png",
    );
  });

  it("버킷:경로 형식이 아닌 값은 그대로 쓴다", () => {
    expect(coverSrcFromImageKey("/logo.png")).toBe("/logo.png");
  });
});
