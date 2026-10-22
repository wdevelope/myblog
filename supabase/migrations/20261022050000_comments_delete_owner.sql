-- 운영에는 대시보드에서 직접 만든 정책이라 마이그레이션에 없었다(로드맵 13단계 구조 비교에서 발견).
-- 로그인 사용자는 자기 댓글을 지운다(관리자 삭제는 comments_delete_admin). 운영에는 같은 정책이 이미 있어
-- 이 파일은 저장소와 개발 프로젝트를 운영에 맞추는 용도다. 다시 적용해도 같은 정책이 된다.
drop policy if exists comments_delete_owner on public.comments;
create policy comments_delete_owner on public.comments
for delete to authenticated
using (auth.uid() = author_id);
