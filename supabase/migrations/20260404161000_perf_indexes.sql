-- 성능 최적화를 위한 인덱스 추가 추천
-- 이 인덱스들은 692ms 가량 소요되던 getPublicPosts 쿼리를 대폭 단축시킵니다.

-- 1. Slug 조회 최적화 (상세 페이지)
create index if not exists posts_slug_idx on public.posts (slug);

-- 2. 타입 및 공개 범위 필터링 최적화 (목록 페이지 및 RLS)
create index if not exists posts_type_visibility_idx on public.posts (type, visibility);

-- 3. 카테고리 필터링 및 RLS 서브쿼리 최적화
create index if not exists posts_category_slug_idx on public.posts (category_slug);

-- 4. 작성일순 정렬 및 카운팅 최적화
create index if not exists posts_created_at_idx on public.posts (created_at desc);

-- 5. 댓글 개수 조인 최적화
create index if not exists comments_post_id_idx on public.comments (post_id);
