-- 방명록(2026-10-22 사용자 결정). 목록은 정적 HTML이라 anon 키로 읽는데, 비밀글 내용은 관리자·작성자·(답글이면)
-- 원글 작성자만 봐야 한다. RLS는 행 단위라 한 표에 두면 열 하나만 숨길 수 없으므로 내용을 두 표로 나눈다.
-- 누구나 읽는 guestbook_entries에는 공개 글 내용만 두고(비밀글은 null), 비밀글 내용은 guestbook_secret_contents에 둔다.

create table if not exists public.guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  -- 댓글처럼 PostgREST 임베드 한 번으로 작성자 닉네임·사진을 읽는다. 탈퇴하면 profiles와 함께 지워진다.
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_is_admin boolean not null default false,
  parent_id uuid references public.guestbook_entries(id) on delete cascade,
  is_secret boolean not null default false,
  content text,
  created_at timestamptz not null default now(),
  -- 공백만인 글과 1000자 넘는 글은 받지 않는다(앱의 zod 검사와 같다). 비밀글 내용은 이 표에 두지 않는다.
  constraint guestbook_entries_content_rule check (
    case when is_secret then content is null
    else coalesce(char_length(content) <= 1000 and content ~ '[^[:space:]]', false) end
  )
);

create index if not exists guestbook_entries_author_id_idx on public.guestbook_entries (author_id);
create index if not exists guestbook_entries_parent_id_idx on public.guestbook_entries (parent_id);

create table if not exists public.guestbook_secret_contents (
  entry_id uuid primary key references public.guestbook_entries(id) on delete cascade,
  content text not null,
  constraint guestbook_secret_contents_content_rule check (
    char_length(content) <= 1000 and content ~ '[^[:space:]]'
  )
);

alter table public.guestbook_entries enable row level security;
alter table public.guestbook_secret_contents enable row level security;

-- 작성자가 관리자인지는 auth.users에만 있어 anon이 읽지 못한다. 댓글(20261022060000)과 같은 판정이라 같은 트리거 함수로
-- 쓰는 사람의 JWT를 남긴다. UPDATE 권한이 없어 넣은 뒤에는 바꿀 수 없다.
drop trigger if exists trg_guestbook_entries_set_author_is_admin on public.guestbook_entries;
create trigger trg_guestbook_entries_set_author_is_admin
before insert on public.guestbook_entries
for each row execute function public.set_comment_author_is_admin();

drop policy if exists guestbook_entries_select_public on public.guestbook_entries;
create policy guestbook_entries_select_public on public.guestbook_entries
for select to anon, authenticated
using (true);

-- 본인 이름으로만 쓴다. 답글은 관리자만, 최상위 글에만 단다. 비밀글에 단 답글은 비밀이어야 원글 작성자 밖으로 새지 않는다.
-- 쓰기 함수를 거치지 않고 PostgREST로 바로 넣어도 같은 규칙이 걸린다.
drop policy if exists guestbook_entries_insert_own on public.guestbook_entries;
create policy guestbook_entries_insert_own on public.guestbook_entries
for insert to authenticated
with check (
  author_id = (select auth.uid())
  and (
    parent_id is null
    or (
      (select public.is_admin())
      and exists (
        select 1 from public.guestbook_entries p
        where p.id = guestbook_entries.parent_id
          and p.parent_id is null
          and (guestbook_entries.is_secret or not p.is_secret)
      )
    )
  )
);

-- 본인 글과, 관리자는 모든 글을 지운다. 답글·비밀글 내용은 cascade로 함께 지워진다. 수정은 없다.
drop policy if exists guestbook_entries_delete_own_or_admin on public.guestbook_entries;
create policy guestbook_entries_delete_own_or_admin on public.guestbook_entries
for delete to authenticated
using (author_id = (select auth.uid()) or (select public.is_admin()));

-- 비밀글 내용은 관리자, 그 글 작성자, 답글이면 원글 작성자만 읽는다. anon에는 권한 자체가 없다.
drop policy if exists guestbook_secret_contents_select_allowed on public.guestbook_secret_contents;
create policy guestbook_secret_contents_select_allowed on public.guestbook_secret_contents
for select to authenticated
using (
  (select public.is_admin())
  or exists (
    select 1
    from public.guestbook_entries e
    left join public.guestbook_entries p on p.id = e.parent_id
    where e.id = guestbook_secret_contents.entry_id
      and (e.author_id = (select auth.uid()) or p.author_id = (select auth.uid()))
  )
);

drop policy if exists guestbook_secret_contents_insert_own on public.guestbook_secret_contents;
create policy guestbook_secret_contents_insert_own on public.guestbook_secret_contents
for insert to authenticated
with check (
  exists (
    select 1 from public.guestbook_entries e
    where e.id = guestbook_secret_contents.entry_id
      and e.is_secret
      and e.author_id = (select auth.uid())
  )
);

-- 10/30 이후 새 객체에 기본 권한이 붙지 않으므로(로드맵 1절) 권한을 직접 쓴다. 그 전에 만든 프로젝트에 붙은 기본 권한은 먼저 지운다.
-- 쓰는 열을 정해 두어 작성 시각·관리자 표시를 클라이언트가 고르지 못하게 한다.
revoke all on public.guestbook_entries from anon, authenticated;
grant select on public.guestbook_entries to anon, authenticated;
grant insert (author_id, parent_id, is_secret, content) on public.guestbook_entries to authenticated;
grant delete on public.guestbook_entries to authenticated;
grant all on public.guestbook_entries to service_role;

revoke all on public.guestbook_secret_contents from anon, authenticated;
grant select on public.guestbook_secret_contents to authenticated;
grant insert (entry_id, content) on public.guestbook_secret_contents to authenticated;
grant all on public.guestbook_secret_contents to service_role;

-- 비밀글은 두 표에 나눠 넣으므로 한 트랜잭션이 되게 함수 하나로 쓴다. security invoker라 위 RLS가 그대로 걸린다.
-- 원글이 없으면 insert가 FK로 실패한다.
create or replace function public.create_guestbook_entry(
  p_content text,
  p_is_secret boolean default false,
  p_parent_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  secret boolean := coalesce(p_is_secret, false);
  new_id uuid;
begin
  if p_parent_id is not null then
    secret := secret or coalesce(
      (select e.is_secret from public.guestbook_entries e where e.id = p_parent_id),
      false
    );
  end if;

  insert into public.guestbook_entries (author_id, parent_id, is_secret, content)
  values ((select auth.uid()), p_parent_id, secret, case when secret then null else p_content end)
  returning id into new_id;

  if secret then
    insert into public.guestbook_secret_contents (entry_id, content)
    values (new_id, p_content);
  end if;

  return new_id;
end;
$$;

revoke execute on function public.create_guestbook_entry(text, boolean, uuid) from public, anon, authenticated;
grant execute on function public.create_guestbook_entry(text, boolean, uuid) to authenticated;
