-- public.users의 쓰기 정책이 자기 행인지(id = auth.uid())만 보고 열을 막지 않아, 로그인 사용자가 자기 행의
-- is_admin을 true로 넣거나 바꿔 is_admin()(RLS)과 앱의 관리자 판정을 통과할 수 있었다.
-- 앱은 users를 읽기만 하므로 anon·authenticated의 쓰기 경로를 모두 닫는다. 관리자 지정은 service role·SQL Editor로만 한다.
drop policy if exists users_insert_own on public.users;
drop policy if exists users_update_own on public.users;
revoke insert, update, delete on table public.users from anon, authenticated;
