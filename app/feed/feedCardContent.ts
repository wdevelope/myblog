import "server-only";
import { PUBLIC_IMAGE_BUCKET, coverKeyOf } from "@/lib/image";
import { renderMarkdown, toExcerpt } from "@/lib/markdown";
import type { Post } from "@/lib/types";

// 표지는 공개 버킷 사진만 된다. 피드는 공개 글이고, 외부 주소는 next/image가 모르는 호스트면 화면이 깨진다.
// 뒤 공백까지 잡아야 사진을 뺀 자리에 빈 줄이 겹쳐 글이 벌어지지 않는다.
const BODY_IMAGE = new RegExp(`!\\[[^\\]]*\\]\\((${PUBLIC_IMAGE_BUCKET}:[^\\s)#]+)[^)]*\\)\\s*`, "g");

// 요약은 글자만 담으므로 사진·코드블록·수식은 펼쳐야 보인다. 글에 쓴 태그는 이스케이프되어 여기 걸리지 않는다.
const NON_TEXT = /<(?:img|pre)\b|class="katex/;

// 피드에는 상세 화면이 없어 카드가 글의 전부다. 카드에 올린 사진은 본문에서 빼 펼쳤을 때 두 번 보이지 않게 하고,
// 요약만으로 다 보이지 않는 글이면 더 보기를 켠다.
export function feedCardContent(post: Pick<Post, "content" | "imageKeys" | "thumbnailImageKey">) {
  const cover = coverKeyOf(post);
  const bodyKeys = Array.from(post.content.matchAll(BODY_IMAGE), (match) => match[1]);
  const imageKeys = cover ? [...new Set([cover, ...post.imageKeys])] : bodyKeys.slice(0, 1);

  const content = post.content.replace(BODY_IMAGE, (image, key: string) => (imageKeys.includes(key) ? "" : image));
  const excerpt = toExcerpt(content, 1000);
  const hasMore = excerpt.length > 140 || NON_TEXT.test(renderMarkdown(content));

  return { imageKeys, content, excerpt, hasMore };
}
