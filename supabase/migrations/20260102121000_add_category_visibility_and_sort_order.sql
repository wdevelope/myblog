-- Add category visibility + ordering
alter table public.categories
  add column if not exists visibility text not null default 'public',
  add column if not exists sort_order integer not null default 0;

alter table public.categories
  drop constraint if exists categories_visibility_check,
  add constraint categories_visibility_check check (visibility in ('public','private'));

create index if not exists categories_sort_order_idx on public.categories (sort_order);

-- Backfill deterministic ordering for existing rows
with ordered as (
  select slug, row_number() over (order by sort_order, slug) as rn
  from public.categories
)
update public.categories c
set sort_order = ordered.rn
from ordered
where c.slug = ordered.slug;

-- RLS: categories should be public-only unless admin
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories
for select to public
using (visibility = 'public' or is_admin());

-- RLS: public posts must also respect category visibility for blog
drop policy if exists posts_select_public on public.posts;
create policy posts_select_public on public.posts
for select to anon, authenticated
using (
  (visibility = 'public')
  and (type <> 'diary')
  and (
    (type <> 'blog')
    or exists (
      select 1
      from public.categories c
      where c.slug = posts.category_slug
        and c.visibility = 'public'
    )
  )
);

-- RLS: comments must also respect category visibility for blog
drop policy if exists comments_select_authenticated on public.comments;
create policy comments_select_authenticated on public.comments
for select to authenticated
using (
  exists (
    select 1
    from public.posts p
    where p.id = comments.post_id
      and (p.type <> 'diary')
      and ((p.visibility = 'public') or is_admin())
      and (
        (p.type <> 'blog')
        or exists (
          select 1
          from public.categories c
          where c.slug = p.category_slug
            and c.visibility = 'public'
        )
      )
  )
);

drop policy if exists comments_insert_authenticated on public.comments;
create policy comments_insert_authenticated on public.comments
for insert to authenticated
with check (
  (author_id = auth.uid())
  and exists (
    select 1
    from public.posts p
    where p.id = comments.post_id
      and (p.type <> 'diary')
      and ((p.visibility = 'public') or is_admin())
      and (
        (p.type <> 'blog')
        or exists (
          select 1
          from public.categories c
          where c.slug = p.category_slug
            and c.visibility = 'public'
        )
      )
  )
);

