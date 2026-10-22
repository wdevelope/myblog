-- 닉네임과 프로필 사진(로드맵 18절). 댓글 목록은 정적 HTML이라 anon 키로 읽으므로 공개로 읽히는 표에 둔다.
-- 규칙은 DB가 지킨다. 앱(lib/nickname.ts)의 검사는 안내용이고, PostgREST를 직접 불러도 이 제약에 걸린다.

-- 닉네임 규칙: 한글·영문·숫자·_ 2~12자, 운영자를 사칭할 수 있는 말은 들어가기만 해도 금지(대소문자 무시).
create or replace function public.nickname_problem(name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when name is null or name !~ '^[가-힣A-Za-z0-9_]{2,12}$' then 'invalid'
    when lower(name) ~ '(owen|오웬|관리자|운영자|admin)' then 'reserved'
  end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  avatar_path text,
  constraint profiles_nickname_rule
    check (nickname is null or public.nickname_problem(nickname) is null),
  -- 브라우저가 본인 폴더에 새 uuid 이름으로 올린 JPEG만 가리킨다.
  constraint profiles_avatar_path_own
    check (avatar_path is null or avatar_path ~ ('^' || id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'))
);

create unique index if not exists profiles_nickname_lower_key on public.profiles (lower(nickname));

alter table public.profiles enable row level security;

drop policy if exists profiles_select_public on public.profiles;
create policy profiles_select_public on public.profiles
for select to anon, authenticated
using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- 행은 가입 트리거가 만들고 계정과 함께 지워지므로 클라이언트에는 읽기와 두 열 고치기만 준다.
-- 10/30 이후 새 객체에 기본 권한이 붙지 않으므로(로드맵 1절) 권한을 직접 쓴다.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (nickname, avatar_path) on public.profiles to authenticated;
grant all on public.profiles to service_role;
grant execute on function public.nickname_problem(text) to anon, authenticated, service_role;

-- 가입 때 보낸 닉네임(raw_user_meta_data.nickname)을 넣는다. 규칙에 어긋나거나 이미 쓰이면 insert가 실패하고
-- 가입도 실패한다(결정 5). user_metadata는 이때 한 번만 읽고 그 뒤 기준은 profiles다.
create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, nullif(btrim(new.raw_user_meta_data ->> 'nickname'), ''));
  return new;
end;
$$;

revoke execute on function public.create_profile_for_new_user() from public, anon, authenticated;

drop trigger if exists trg_auth_users_create_profile on auth.users;
create trigger trg_auth_users_create_profile
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

-- 기존 계정은 닉네임 없이 채운다(결정 6).
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- 댓글 조회가 PostgREST 임베드 한 번으로 작성자 프로필을 같이 읽게 잇는다(auth.users는 노출 스키마가 아니다).
alter table public.comments drop constraint if exists comments_author_id_profiles_fkey;
alter table public.comments
  add constraint comments_author_id_profiles_fkey
  foreign key (author_id) references public.profiles(id) on delete cascade;

-- 중복확인 버튼용. 닉네임은 댓글에 공개되는 값이라 anon에게 있는지 알려 줘도 새는 정보가 없다.
-- ilike로 찾으면 닉네임에 쓰는 _가 와일드카드가 되므로 lower()로 같은지 본다. 본인의 지금 닉네임은 쓰는 중으로 치지 않는다.
create or replace function public.check_nickname(name text)
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    public.nickname_problem(name),
    case when exists (
      select 1 from public.profiles p
      where lower(p.nickname) = lower(name)
        and p.id is distinct from (select auth.uid())
    ) then 'taken' end,
    'ok'
  );
$$;

grant execute on function public.check_nickname(text) to anon, authenticated, service_role;

-- 프로필 사진: 공개 버킷. 브라우저가 256px JPEG로 줄여 올리므로 1MB면 넉넉하다. SVG 같은 다른 형식은 받지 않는다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg'])
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- 로그인 사용자는 본인 폴더(<id>/)에만 올리고 지운다. 지우기(remove)에 select·delete가 둘 다 필요해 읽기 정책도 둔다.
-- 화면은 공개 버킷 주소로 읽으므로 방문자 읽기 정책은 필요 없다.
drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
for insert to authenticated
with check (
  bucket_id = 'avatars'
  and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$')
);

drop policy if exists avatars_select_own on storage.objects;
create policy avatars_select_own on storage.objects
for select to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
