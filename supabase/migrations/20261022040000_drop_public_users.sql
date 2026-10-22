-- public.users는 관리자 표시만 담던 테이블이다(로드맵 10단계 3번). RLS is_admin()(20261022030000)과 앱 getViewer가
-- 모두 app_metadata.is_admin으로 판정해 더는 읽는 곳이 없고, 이름 때문에 회원 목록으로 오해하기도 했다.
-- 정책 2개와 trg_users_set_updated_at는 테이블과 함께 지워진다. 다른 객체가 이 테이블을 참조하면 restrict로 실패한다.
drop table if exists public.users restrict;
