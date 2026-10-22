import type { PostType } from "@/lib/types";

// sitemap·robots·메타데이터의 기준 주소.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.w-owen.com";

// 글 타입 이름과 경로 이름이 다르다(blog → /article).
const POST_TYPE_PATH: Record<PostType, string> = {
  blog: "/article",
  feed: "/feed",
  diary: "/diary",
};

export function postHref(type: PostType, slug?: string) {
  // 피드는 상세 화면이 없다.
  if (!slug || type === "feed") return POST_TYPE_PATH[type];
  return `${POST_TYPE_PATH[type]}/${slug}`;
}

// /article 목록은 카테고리·쪽 번호를 경로로 나눠 정적으로 만든다(5단계 결정 2).
export function articleListHref(category?: string | null, page = 1) {
  const base = category ? `/article/category/${encodeURIComponent(category)}` : "/article";
  return page > 1 ? `${base}/page/${page}` : base;
}
