-- 20261106010000 kept the default privileges on posts and categories (writes go through service role only, and RLS blocks the rest).
-- But TRUNCATE ignores RLS, so anon and authenticated end up holding a table-wipe privilege. Like comments and the guestbook tables, leave them only SELECT.
-- Posts and categories are written only through service role (savePost, the category actions), so this doesn't change app behavior.
-- Comment and guestbook RLS check posts and categories through subqueries, and only SELECT is needed for that.
revoke all on public.posts, public.categories from anon, authenticated;
grant select on public.posts, public.categories to anon, authenticated;
grant all on public.posts, public.categories to service_role;
