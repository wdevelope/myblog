-- Add view count for posts (articles/diary/feed)
alter table public.posts
  add column if not exists view_count bigint not null default 0;

-- Atomic increment helper (used from server-side with service role)
create or replace function public.increment_post_view(p_slug text)
returns bigint
language plpgsql
security definer
as $$
declare
  next_count bigint;
begin
  update public.posts
  set view_count = coalesce(view_count, 0) + 1
  where slug = p_slug
  returning view_count into next_count;

  return coalesce(next_count, 0);
end;
$$;

revoke all on function public.increment_post_view(text) from public;
grant execute on function public.increment_post_view(text) to service_role;
