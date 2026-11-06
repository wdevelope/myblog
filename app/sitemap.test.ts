import { describe, expect, it, vi } from "vitest";
import sitemap from "@/app/sitemap";

vi.mock("@/lib/server/publicPosts", () => ({
  getPublicPosts: async () => ({
    data: [{ slug: "post-1", updatedAt: "2026-11-01T00:00:00.000Z" }],
  }),
}));

describe("sitemap", () => {
  it("글은 실제 수정일을 싣고, 고정 페이지는 날짜를 싣지 않는다", async () => {
    const entries = await sitemap();
    const post = entries.find((entry) => entry.url.endsWith("/article/post-1"));
    const fixed = entries.filter((entry) => entry !== post);

    expect(post?.lastModified).toEqual(new Date("2026-11-01T00:00:00.000Z"));
    expect(fixed.length).toBeGreaterThan(0);
    expect(fixed.every((entry) => entry.lastModified === undefined)).toBe(true);
  });
});
