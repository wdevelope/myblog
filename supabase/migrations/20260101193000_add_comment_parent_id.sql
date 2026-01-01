-- Add parent_id for comment replies (1-depth thread)
alter table public.comments
  add column if not exists parent_id uuid null references public.comments(id) on delete cascade;

create index if not exists comments_post_parent_created_idx
  on public.comments(post_id, parent_id, created_at);

