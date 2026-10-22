import { describe, expect, it, vi } from "vitest";
import { blogPostingJsonLd } from "@/lib/structured-data";

const post = {
  slug: "post-abc123",
  title: "Next.js 정리",
  createdAt: "2026-10-01T05:00:00+00:00",
  updatedAt: "2026-10-02T06:00:00+00:00",
  thumbnailImageKey: null,
  imageKeys: [],
};

describe("blogPostingJsonLd", () => {
  it("제목·대표 주소·작성일·수정일·작성자를 BlogPosting으로 만든다", () => {
    expect(JSON.parse(blogPostingJsonLd(post))).toEqual({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: "Next.js 정리",
      url: "https://www.w-owen.com/article/post-abc123",
      datePublished: "2026-10-01T05:00:00+00:00",
      dateModified: "2026-10-02T06:00:00+00:00",
      author: { "@type": "Person", name: "오웬", url: "https://www.w-owen.com" },
    });
  });

  it("제목에 </script>가 있어도 태그를 닫지 못하게 <를 이스케이프한다", () => {
    const title = "</script><script>alert(1)</script>";
    const json = blogPostingJsonLd({ ...post, title });

    expect(json).not.toContain("<");
    expect(JSON.parse(json).headline).toBe(title);
  });

  it("표지 이미지가 있으면 공개 버킷의 절대 주소를 image로 넣는다", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");

    const json = blogPostingJsonLd({ ...post, imageKeys: ["post-images-public:2026-10-01/a.png"] });

    expect(JSON.parse(json).image).toBe(
      "https://project.supabase.co/storage/v1/object/public/post-images-public/2026-10-01/a.png",
    );
  });
});
