import { getPublicPosts } from "@/lib/server/publicPosts";
import { toExcerpt } from "@/lib/markdown";
import { buildRssFeed } from "@/lib/rss";
import { SITE_URL, postHref } from "@/lib/constants";

// 공개 아티클만 anon 키로 읽으므로 비공개 글은 들어가지 않는다. 피드 글은 상세 주소가 없어 넣지 않는다.
// 조회가 태그 캐시(posts:public:blog)라 글을 쓰면 updateTag로 이 응답도 다시 만들어진다.
export const dynamic = "force-static";
export const revalidate = 86400; // REVALIDATE_PERIOD

const RSS_ITEM_LIMIT = 30;

export async function GET() {
  const { data: posts } = await getPublicPosts({ type: "blog", page: 1, limit: RSS_ITEM_LIMIT });

  const xml = buildRssFeed({
    title: "개발자 오웬",
    description: "개발자 오웬의 인생이야기",
    siteUrl: SITE_URL,
    feedUrl: `${SITE_URL}/rss.xml`,
    items: posts.map((post) => ({
      title: post.title,
      url: `${SITE_URL}${postHref("blog", post.slug)}`,
      description: toExcerpt(post.content, 300),
      publishedAt: post.createdAt,
      category: post.categorySlug,
    })),
  });

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
