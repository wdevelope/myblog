// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import ArticleListItem from "@/app/article/ArticleListItem";
import type { Post } from "@/lib/types";

const POST: Post = {
  id: "p1",
  slug: "post-1",
  type: "blog",
  visibility: "private",
  title: "제목",
  content: "본문",
  categorySlug: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  imageKeys: [],
  thumbnailImageKey: null,
  viewCount: 0,
  commentCount: 0,
};

// vitest globals가 꺼져 있어 Testing Library가 자동으로 정리하지 않는다.
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

function coverSrc(thumbnailImageKey: string) {
  const { container } = render(<ArticleListItem post={{ ...POST, thumbnailImageKey }} />);
  return container.querySelector("img")?.getAttribute("src");
}

describe("아티클 목록 표지", () => {
  it("비공개 표지는 변환기를 거치지 않고 브라우저가 직접 받는다", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");

    expect(coverSrc("post-images-private:2026-01-01/a.png")).toBe(
      "/api/images?bucket=post-images-private&path=2026-01-01%2Fa.png",
    );
  });

  it("공개 표지는 변환기를 거친다", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");

    expect(coverSrc("post-images-public:2026-01-01/a.png")).toContain("/_next/image?url=");
  });
});
