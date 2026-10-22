-- Extensions
create extension if not exists pgcrypto;

-- Helper: updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Users table (profile/role)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_users_set_updated_at on public.users;
create trigger trg_users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

-- Admin check function for RLS
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select u.is_admin from public.users u where u.id = auth.uid()), false);
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Posts
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  type text not null check (type in ('blog','feed','diary')),
  visibility text not null check (visibility in ('public','private')),
  title text not null,
  content text not null,
  category_slug text,
  image_keys text[],
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists posts_slug_key on public.posts (slug);
create index if not exists posts_type_created_at_idx on public.posts (type, created_at desc);
create index if not exists posts_blog_category_created_at_idx on public.posts (category_slug, created_at desc) where type = 'blog';

drop trigger if exists trg_posts_set_updated_at on public.posts;
create trigger trg_posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

-- Comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_post_created_at_idx on public.comments (post_id, created_at asc);

-- RLS
alter table public.users enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;

-- Users policies
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
on public.users
for select
to authenticated
using (id = auth.uid());

drop policy if exists "users_select_admin" on public.users;
create policy "users_select_admin"
on public.users
for select
to authenticated
using (public.is_admin());

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
on public.users
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Posts policies
drop policy if exists "posts_select_public" on public.posts;
create policy "posts_select_public"
on public.posts
for select
to anon, authenticated
using (visibility = 'public' and type <> 'diary');

drop policy if exists "posts_select_admin" on public.posts;
create policy "posts_select_admin"
on public.posts
for select
to authenticated
using (public.is_admin());

drop policy if exists "posts_write_admin" on public.posts;
create policy "posts_write_admin"
on public.posts
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "posts_update_admin" on public.posts;
create policy "posts_update_admin"
on public.posts
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "posts_delete_admin" on public.posts;
create policy "posts_delete_admin"
on public.posts
for delete
to authenticated
using (public.is_admin());

-- Comments policies
-- 로그인 사용자만 조회/작성 가능, diary 금지, private 글의 댓글은 admin만

drop policy if exists "comments_select_authenticated" on public.comments;
create policy "comments_select_authenticated"
on public.comments
for select
to authenticated
using (
  exists (
    select 1
    from public.posts p
    where p.id = comments.post_id
      and p.type <> 'diary'
      and (p.visibility = 'public' or public.is_admin())
  )
);

drop policy if exists "comments_insert_authenticated" on public.comments;
create policy "comments_insert_authenticated"
on public.comments
for insert
to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.posts p
    where p.id = comments.post_id
      and p.type <> 'diary'
      and (p.visibility = 'public' or public.is_admin())
  )
);

drop policy if exists "comments_delete_admin" on public.comments;
create policy "comments_delete_admin"
on public.comments
for delete
to authenticated
using (public.is_admin());
