import type { Metadata } from "next";
import type { PostType } from "@/lib/types";

// sitemap·robots·메타데이터의 기준 주소.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.w-owen.com";

// 서버 액션은 실패를 값으로 돌려주지만, 연결이 끊기거나 배포로 액션이 바뀌면 예외가 된다.
// transition 안의 예외는 화면 전체를 오류 화면으로 바꿔 쓰던 내용을 지우므로 호출하는 곳에서 이 값으로 바꾼다.
export const ACTION_FAILED = {
  success: false,
  error: "요청을 보내지 못했어요. 새로고침한 뒤 다시 시도해 주세요.",
} as const;

// 루트 레이아웃과 홈이 같이 쓴다. 하위 페이지가 alternates·openGraph를 정하면 상위 값이 통째로 덮여 홈이 다시 넣는다.
export const RSS_ALTERNATE_TYPES = {
  "application/rss+xml": [{ url: "/rss.xml", title: "개발자 오웬" }],
};
export const SITE_OPEN_GRAPH = {
  title: "개발자 오웬",
  description: "개발자 오웬의 인생이야기",
  type: "website",
  locale: "ko_KR",
} satisfies Metadata["openGraph"];

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

// 헤더와 모바일 메뉴가 같이 쓴다.
export const NAV_LINKS = [
  { href: "/feed", label: "피드" },
  { href: "/article", label: "아티클" },
  { href: "/diary", label: "다이어리" },
  { href: "/guestbook", label: "방명록" },
];

export function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// /article 목록은 카테고리·쪽 번호를 경로로 나눠 정적으로 만든다(5단계 결정 2).
export function articleListHref(category?: string | null, page = 1) {
  const base = category ? `/article/category/${encodeURIComponent(category)}` : "/article";
  return page > 1 ? `${base}/page/${page}` : base;
}
