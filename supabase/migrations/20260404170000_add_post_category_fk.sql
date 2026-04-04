-- Add foreign key relationship between posts and categories
-- This is required for PostgREST to support nested count queries like categories?select=slug,posts(count)

-- 1. Ensure Index exists for performance
create index if not exists posts_category_slug_idx on public.posts (category_slug);

-- 2. Add Foreign Key constraint
-- Note: We already checked for orphaned category_slugs in a previous step.
alter table public.posts
  add constraint posts_category_slug_fkey 
  foreign key (category_slug) 
  references public.categories(slug)
  on update cascade
  on delete set null;
