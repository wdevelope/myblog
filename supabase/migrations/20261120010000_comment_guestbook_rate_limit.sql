-- 로그인한 사람 하나가 스크립트로 댓글·방명록을 끝없이 쓸 수 있었다. 글마다 정적 페이지를 다시 만들고 관리자 메일이 나가므로 횟수를 막는다.
-- 서버 액션만이 아니라 PostgREST 직접 insert와 create_guestbook_entry로도 쓰므로 모든 길이 지나는 트리거에서 센다.
-- insert 정책이 author_id = auth.uid()로 묶고 created_at은 쓸 수 있는 열이 아니라서, 작성자별 최근 행 수를 믿을 수 있다.
-- 오류 코드 PT429는 PostgREST가 HTTP 429로 돌려주고, 앱은 이 코드로 안내 문구를 고른다(lib/constants.ts RATE_LIMITED_CODE).

create index if not exists comments_author_id_created_at_idx on public.comments (author_id, created_at desc);

-- 작성자로만 찾던 인덱스를 시각까지 담은 것으로 바꾼다. 앞 열이 같아 작성자 조회(탈퇴 cascade)도 그대로 쓴다.
create index if not exists guestbook_entries_author_id_created_at_idx on public.guestbook_entries (author_id, created_at desc);
drop index if exists public.guestbook_entries_author_id_idx;

-- security definer: 공개 범위가 바뀌어 RLS로 안 보이게 된 본인 댓글까지 센다.
create or replace function public.check_comment_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  last_minute integer;
  last_hour integer;
begin
  if public.is_admin() then
    return new;
  end if;

  -- 같은 사람이 동시에 보낸 요청이 서로의 행을 보지 못한 채 함께 통과하지 않게 줄 세운다(트랜잭션이 끝나면 풀린다).
  perform pg_advisory_xact_lock(hashtextextended('comment_rate:' || new.author_id::text, 0));

  select
    count(*) filter (where c.created_at > now() - interval '1 minute'),
    count(*)
  into last_minute, last_hour
  from public.comments c
  where c.author_id = new.author_id
    and c.created_at > now() - interval '1 hour';

  if last_minute >= 5 or last_hour >= 30 then
    raise exception '댓글을 너무 자주 쓰고 있습니다.' using errcode = 'PT429';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_comment_rate() from public, anon, authenticated;

drop trigger if exists trg_comments_check_rate on public.comments;
create trigger trg_comments_check_rate
before insert on public.comments
for each row execute function public.check_comment_rate();

create or replace function public.check_guestbook_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  last_ten_minutes integer;
  last_day integer;
begin
  if public.is_admin() then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('guestbook_rate:' || new.author_id::text, 0));

  select
    count(*) filter (where e.created_at > now() - interval '10 minutes'),
    count(*)
  into last_ten_minutes, last_day
  from public.guestbook_entries e
  where e.author_id = new.author_id
    and e.created_at > now() - interval '1 day';

  if last_ten_minutes >= 3 or last_day >= 10 then
    raise exception '방명록을 너무 자주 쓰고 있습니다.' using errcode = 'PT429';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_guestbook_rate() from public, anon, authenticated;

drop trigger if exists trg_guestbook_entries_check_rate on public.guestbook_entries;
create trigger trg_guestbook_entries_check_rate
before insert on public.guestbook_entries
for each row execute function public.check_guestbook_rate();
