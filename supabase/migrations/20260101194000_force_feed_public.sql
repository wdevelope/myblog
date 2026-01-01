-- Feed posts are always public by design.
update public.posts
set visibility = 'public'
where type = 'feed'
  and visibility <> 'public';
