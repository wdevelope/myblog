import { describe, expect, it } from "vitest";
import { buildRssFeed, escapeXml } from "@/lib/rss";

const channel = {
  title: "개발자 오웬",
  description: "개발자 오웬의 인생이야기",
  siteUrl: "https://www.w-owen.com",
  feedUrl: "https://www.w-owen.com/rss.xml",
};

describe("escapeXml", () => {
  it("XML 특수문자를 엔티티로 바꾼다", () => {
    expect(escapeXml(`<b>"A&B"</b> 'c'`)).toBe("&lt;b&gt;&quot;A&amp;B&quot;&lt;/b&gt; &apos;c&apos;");
  });

  it("XML에 넣을 수 없는 제어 문자는 지우고 줄바꿈·탭은 남긴다", () => {
    expect(escapeXml("가\u0000나\u0008다\n라\t마")).toBe("가나다\n라\t마");
  });
});

describe("buildRssFeed", () => {
  it("채널 정보와 글마다 제목·주소·guid·날짜·카테고리·요약을 넣는다", () => {
    const xml = buildRssFeed({
      ...channel,
      items: [
        {
          title: "Next.js & Supabase <정리>",
          url: "https://www.w-owen.com/article/post-abc",
          description: "요약 \"따옴표\"",
          publishedAt: "2026-10-22T05:00:00Z",
          category: "개발",
        },
      ],
    });

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain("<title>개발자 오웬</title>");
    expect(xml).toContain("<link>https://www.w-owen.com</link>");
    expect(xml).toContain("<language>ko</language>");
    expect(xml).toContain('<atom:link href="https://www.w-owen.com/rss.xml" rel="self" type="application/rss+xml" />');
    expect(xml).toContain("<title>Next.js &amp; Supabase &lt;정리&gt;</title>");
    expect(xml).toContain('<guid isPermaLink="true">https://www.w-owen.com/article/post-abc</guid>');
    expect(xml).toContain("<pubDate>Thu, 22 Oct 2026 05:00:00 GMT</pubDate>");
    expect(xml).toContain("<category>개발</category>");
    expect(xml).toContain("<description>요약 &quot;따옴표&quot;</description>");
    expect(xml).toContain("<lastBuildDate>Thu, 22 Oct 2026 05:00:00 GMT</lastBuildDate>");
  });

  it("카테고리가 없으면 category 태그를 넣지 않는다", () => {
    const xml = buildRssFeed({
      ...channel,
      items: [{ title: "글", url: "https://x.test/a", description: "", publishedAt: "2026-01-01T00:00:00Z", category: null }],
    });
    expect(xml).not.toContain("<category>");
  });

  it("글이 없어도 올바른 빈 채널이고 마지막 갱신 시각을 넣지 않는다", () => {
    const xml = buildRssFeed({ ...channel, items: [] });
    expect(xml).not.toContain("<item>");
    expect(xml).not.toContain("<lastBuildDate>");
    expect(xml.trimEnd().endsWith("</rss>")).toBe(true);
  });
});
