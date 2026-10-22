// RSS 2.0 문서를 만든다. 글 제목·본문 요약은 관리자가 쓴 값이지만 XML 특수문자가 섞일 수 있어 모두 이스케이프한다.

export type RssItem = {
  title: string;
  url: string;
  description: string;
  publishedAt: string;
  category?: string | null;
};

export type RssChannel = {
  title: string;
  description: string;
  siteUrl: string;
  feedUrl: string;
  items: RssItem[];
};

// XML 1.0에 넣을 수 없는 제어 문자는 지운다. 남아 있으면 리더가 문서 전체를 거부한다.
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

export function escapeXml(value: string): string {
  return value
    .replace(INVALID_XML_CHARS, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

// RSS 2.0은 RFC 822 날짜를 쓴다. toUTCString()이 같은 모양(`Thu, 22 Oct 2026 05:00:00 GMT`)이다.
function rfc822(date: string) {
  return new Date(date).toUTCString();
}

export function buildRssFeed(channel: RssChannel): string {
  const items = channel.items.map((item) =>
    [
      "    <item>",
      `      <title>${escapeXml(item.title)}</title>`,
      `      <link>${escapeXml(item.url)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(item.url)}</guid>`,
      `      <pubDate>${rfc822(item.publishedAt)}</pubDate>`,
      item.category ? `      <category>${escapeXml(item.category)}</category>` : null,
      `      <description>${escapeXml(item.description)}</description>`,
      "    </item>",
    ]
      .filter((line) => line !== null)
      .join("\n")
  );

  // 글이 없을 때도 문서가 바뀌지 않게, 마지막 갱신 시각은 지금이 아니라 가장 최근 글의 시각을 쓴다.
  const lastBuildDate = channel.items[0] ? rfc822(channel.items[0].publishedAt) : null;

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(channel.title)}</title>`,
    `    <link>${escapeXml(channel.siteUrl)}</link>`,
    `    <description>${escapeXml(channel.description)}</description>`,
    "    <language>ko</language>",
    lastBuildDate ? `    <lastBuildDate>${lastBuildDate}</lastBuildDate>` : null,
    `    <atom:link href="${escapeXml(channel.feedUrl)}" rel="self" type="application/rss+xml" />`,
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ]
    .filter((line) => line !== null)
    .join("\n");
}
