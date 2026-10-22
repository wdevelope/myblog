import { SITE_URL, postHref } from "@/lib/constants";
import { coverKeyOf, coverSrcFromImageKey } from "@/lib/image";
import type { Post } from "@/lib/types";

type BlogPostingFields = Pick<Post, "slug" | "title" | "createdAt" | "updatedAt" | "thumbnailImageKey" | "imageKeys">;

// 아티클 상세의 BlogPosting. <script> 안에 그대로 넣으므로 <를 이스케이프해 제목이 태그를 닫지 못하게 한다.
export function blogPostingJsonLd(post: BlogPostingFields) {
  const cover = coverKeyOf(post);
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    url: new URL(postHref("blog", post.slug), SITE_URL).href,
    datePublished: post.createdAt,
    dateModified: post.updatedAt,
    author: { "@type": "Person", name: "오웬", url: SITE_URL },
    image: cover ? new URL(coverSrcFromImageKey(cover), SITE_URL).href : undefined,
  }).replace(/</g, "\\u003c");
}
