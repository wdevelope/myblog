-- 5단계 결정 4: 댓글은 누구나 읽는다. 조회 조건(공개 글, 다이어리 제외, 아티클은 공개 카테고리, 관리자는 비공개 글도)은
-- 그대로 두고 대상 역할만 anon까지 넓힌다. 쓰기·삭제 정책은 바꾸지 않는다.
alter policy comments_select_authenticated on public.comments to anon, authenticated;
alter policy comments_select_authenticated on public.comments rename to comments_select_public;
