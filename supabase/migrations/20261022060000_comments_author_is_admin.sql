-- 댓글 아바타는 관리자만 오웬 로고다(로드맵 17절). 댓글 목록은 정적 HTML이라 anon 키로 읽는데, 작성자가
-- 관리자인지는 auth.users의 app_metadata에만 있어 읽을 수 없다. 쓰는 순간의 판정을 열에 남긴다.
alter table public.comments
  add column if not exists author_is_admin boolean not null default false;

-- PostgREST로 쓰는 요청(anon·authenticated)은 보낸 값과 상관없이 쓰는 사람의 JWT(is_admin())로 정한다.
-- seed·SQL Editor(postgres·service_role)는 작성자를 직접 고르므로 넣은 값을 그대로 둔다.
-- 댓글은 UPDATE 정책이 없어 넣은 뒤에는 바꿀 수 없다.
create or replace function public.set_comment_author_is_admin()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.author_is_admin := public.is_admin();
  end if;
  return new;
end;
$$;

revoke execute on function public.set_comment_author_is_admin() from public, anon, authenticated;

drop trigger if exists trg_comments_set_author_is_admin on public.comments;
create trigger trg_comments_set_author_is_admin
before insert on public.comments
for each row execute function public.set_comment_author_is_admin();

-- 기존 댓글: is_admin()과 같은 기준(JSON true)으로 채운다.
update public.comments c
set author_is_admin = true
from auth.users u
where u.id = c.author_id
  and (u.raw_app_meta_data -> 'is_admin') = 'true'::jsonb;
