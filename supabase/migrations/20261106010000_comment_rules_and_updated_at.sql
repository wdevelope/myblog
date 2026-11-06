-- 조회수 증가도 posts를 고쳐서 수정일이 "마지막으로 본 날"이 되고 sitemap과 구조화 데이터의 날짜가 틀렸다.
drop trigger if exists trg_posts_set_updated_at on public.posts;
create trigger trg_posts_set_updated_at
before update on public.posts
for each row
when (old.view_count is not distinct from new.view_count)
execute function public.set_updated_at();

alter function public.set_updated_at() set search_path = '';

-- 댓글은 정적 페이지에 그대로 실려 모든 방문자가 내려받는다. 방명록과 같은 규칙이고 앱의 zod 검사와 같다.
alter table public.comments
  add constraint comments_content_rule check (char_length(content) <= 1000 and content ~ '[^[:space:]]');

-- 화면은 답글을 한 단계만 그려서, 규칙을 벗어난 답글은 보이지 않고 수만 늘린다. PostgREST로 직접 쓰는 요청까지 막는다.
-- 쓰기 정책에서 comments를 읽으면 comments_select_public의 하위 조회와 얽혀 재귀 오류가 나므로 트리거에서 본다.
create or replace function public.check_comment_parent()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.parent_id is not null and not exists (
    select 1
    from public.comments parent
    where parent.id = new.parent_id
      and parent.post_id = new.post_id
      and parent.parent_id is null
  ) then
    raise exception '답글은 같은 글의 최상위 댓글에만 달 수 있습니다.' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_comment_parent() from public, anon, authenticated;

drop trigger if exists trg_comments_check_parent on public.comments;
create trigger trg_comments_check_parent
before insert on public.comments
for each row execute function public.check_comment_parent();

-- 10/30 이후 새 프로젝트의 표에는 기본 권한이 붙지 않아(로드맵 1절) 이 파일들만으로 만든 DB가 동작하도록 권한을 직접 쓴다.
-- 쓰는 열을 정해 두어 작성 시각·관리자 표시를 클라이언트가 고르지 못하게 한다(방명록과 같다).
revoke all on public.comments from anon, authenticated;
grant select on public.comments to anon, authenticated;
grant insert (post_id, author_id, content, parent_id) on public.comments to authenticated;
grant delete on public.comments to authenticated;
grant all on public.comments to service_role;

-- 글·카테고리 쓰기는 service role만 한다. 기존 프로젝트에 붙은 기본 권한은 RLS가 막고 있어 그대로 둔다.
grant select on public.posts, public.categories to anon, authenticated;
grant all on public.posts, public.categories to service_role;
