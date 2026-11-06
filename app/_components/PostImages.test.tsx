// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import PostImages from "@/app/_components/PostImages";

// vitest globals가 꺼져 있어 Testing Library가 자동으로 정리하지 않는다.
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

function renderedSrc(key: string) {
  const { container } = render(<PostImages imageKeys={[key]} />);
  return container.querySelector("img")?.getAttribute("src");
}

describe("첨부 이미지", () => {
  it("비공개 이미지는 변환기를 거치지 않고 브라우저가 직접 받는다", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");

    expect(renderedSrc("post-images-private:2026-01-01/a.png")).toBe(
      "/api/images?bucket=post-images-private&path=2026-01-01%2Fa.png",
    );
  });

  it("공개 이미지는 변환기를 거친다", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");

    expect(renderedSrc("post-images-public:2026-01-01/a.png")).toContain("/_next/image?url=");
  });
});
