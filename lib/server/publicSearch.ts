import "server-only";

import type { Post } from "@/lib/types";
import { buildSearchFilter, normalizeSearchQuery } from "@/lib/search";
import { POST_COLUMNS, fetchPublicRest, publicPostsTag } from "@/lib/server/publicPosts";
import { mapPost, type PostRow } from "@/lib/server/postRow";

export const SEARCH_RESULT_LIMIT = 50;

// 공개 아티클만 찾는다. 다이어리는 본문이 관리자 전용이고 피드는 상세 화면이 없다.
// anon 키라 RLS가 비공개 글·비공개 카테고리 글을 거르지만, 공개·아티클 조건도 항상 직접 건다.
// 관리자 화면(draft mode)이어도 같은 공개 결과를 준다(쿠키를 읽지 않는다).
// 공개 목록과 같은 태그 캐시라 글을 쓰면 revalidatePublicPosts가 검색 결과도 바로 무효화한다.
export async function searchPublicArticles(rawQuery: string): Promise<Post[]> {
  const query = normalizeSearchQuery(rawQuery);
  if (!query) return [];

  const search = new URLSearchParams();
  search.set("select", POST_COLUMNS);
  search.set("type", "eq.blog");
  search.set("visibility", "eq.public");
  search.set("or", buildSearchFilter(query));
  search.set("order", "created_at.desc");
  search.set("limit", String(SEARCH_RESULT_LIMIT));

  const response = await fetchPublicRest("posts", search, [publicPostsTag("blog")]);
  if (!response.ok) {
    throw new Error(`Supabase REST ${response.status}: ${await response.text()}`);
  }

  const rows = (await response.json()) as PostRow[];
  return rows.map(mapPost);
}
