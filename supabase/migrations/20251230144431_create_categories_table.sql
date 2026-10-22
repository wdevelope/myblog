create table if not exists public.categories (
  slug text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.categories enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='categories' and policyname='categories_select'
  ) then
    create policy "categories_select" on public.categories
      for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='categories' and policyname='categories_admin_write'
  ) then
    create policy "categories_admin_write" on public.categories
      for all
      using (public.is_admin())
      with check (public.is_admin());
  end if;
end $$;