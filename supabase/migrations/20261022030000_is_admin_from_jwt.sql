-- 관리자 판정 근거를 app_metadata.is_admin 하나로 합친다(로드맵 10단계).
-- 앱(getViewer)은 app_metadata를, RLS의 is_admin()은 public.users를 따로 봐서 두 값이 어긋나면 판정이 갈렸다.
-- app_metadata는 service role만 바꿀 수 있고 JWT에 실리므로 테이블을 읽지 않는다. 그래서 노출 스키마에
-- SECURITY DEFINER로 둘 이유도 없어진다. 이름·인자가 같아 이 함수를 쓰는 RLS 정책 10개와 권한은 그대로다.
-- JSON true만 관리자로 본다(문자열 "true"는 아니다). 앱의 getViewer도 같은 기준이다.
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' -> 'is_admin') = 'true'::jsonb, false);
$$;
