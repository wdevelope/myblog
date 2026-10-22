-- 로드맵 19절: increment_post_view는 security definer인데 anon·authenticated가 /rest/v1/rpc로 불렀다.
-- 20260101190000의 revoke ... from public은 Supabase가 두 역할에 따로 준 기본 권한을 지우지 못한다.
-- 누구나 비공개 글·다이어리의 조회수를 바꾸고, 돌려받는 값으로 slug가 있는지 알 수 있었다.
-- 앱은 이 함수를 쓰지 않는다. 조회수 기능을 만들면 서버에서 service role로 부른다.
revoke execute on function public.increment_post_view(text) from anon, authenticated;

-- 정의자 권한 함수라 호출자의 search_path로 다른 객체를 찾지 않게 한다. 본문은 public.posts로 적혀 있어 동작은 같다.
alter function public.increment_post_view(text) set search_path = '';
