-- 개발 프로젝트(myblog-dev)용 가짜 데이터. 운영 DB에는 넣지 않는다(로드맵 13단계, 결정 2).
-- 공개·비공개 범위와 글 타입별 화면을 확인할 수 있게 경우마다 하나 이상 넣는다. 다시 실행해도 겹치지 않는다.
--
-- 테스트 계정은 저장소에 비밀번호를 두지 않으려고 대시보드(Authentication → Add user, Auto Confirm)에서 만든다.
-- 관리자는 만든 뒤 SQL Editor에서 지정하고 다시 로그인한다:
--   update auth.users set raw_app_meta_data = raw_app_meta_data || '{"is_admin": true}' where email = '<관리자 이메일>';
-- 계정이 있으면 글 작성자와 댓글을 채우고, 없으면 댓글은 건너뛴다. 계정을 만든 뒤 이 파일을 다시 실행하면 된다.

insert into public.categories (slug, visibility, sort_order) values
  ('개발', 'public', 1),
  ('일상', 'public', 2),
  ('비밀노트', 'private', 3)
on conflict (slug) do nothing;

with admin_user as (
  select id from auth.users where raw_app_meta_data -> 'is_admin' = 'true'::jsonb order by created_at limit 1
)
insert into public.posts (slug, type, visibility, title, content, category_slug, author_id, created_at)
select v.slug, v.type, v.visibility, v.title, v.content, v.category_slug, (select id from admin_user), now() - v.age
from (values
  ('post-dev001', 'blog', 'public', '마크다운 서식 모음',
   E'**굵게**, *기울임*, ~~취소선~~, ++밑줄++, ==형광펜==을 한 문단에 모았다.\n\n## 목록\n\n- 첫째\n- 둘째\n\n1. 하나\n2. 둘\n\n> 인용문 한 줄\n\n인라인 수식 $E = mc^2$와 블록 수식:\n\n$$\n\\int_0^1 x^2\\,dx = \\frac{1}{3}\n$$\n\n```ts\nconst greeting = "안녕하세요";\n```\n\n[링크](https://example.com)\n\n---\n\n| 열 1 | 열 2 |\n| --- | --- |\n| 가 | 나 |',
   '개발', interval '1 day'),
  ('post-dev002', 'blog', 'public', '공개 카테고리의 두 번째 글',
   E'목록에서 카테고리별 개수와 쪽 나눔을 확인하는 글이다.\n\n줄바꿈은\n엔터 한 번이다.',
   '일상', interval '3 days'),
  ('post-dev003', 'blog', 'public', '비공개 카테고리에 있는 공개 글',
   E'글은 공개지만 카테고리가 비공개라 방문자 목록에는 나오지 않아야 한다.',
   '비밀노트', interval '5 days'),
  ('post-dev004', 'blog', 'private', '비공개 아티클',
   E'관리자 화면에서만 보여야 하는 글이다.',
   '개발', interval '7 days'),
  ('post-dev005', 'blog', 'public', '카테고리 없는 공개 글',
   E'카테고리가 없는 공개 글은 방문자 목록에서 빠진다(알려진 문제 확인용).',
   null, interval '9 days'),
  ('post-dev101', 'feed', 'public', '피드 첫 글',
   E'짧은 피드 글. **굵게**와 ==형광펜==이 카드에서 어떻게 보이는지 본다.',
   null, interval '2 hours'),
  ('post-dev102', 'feed', 'public', '피드 두 번째 글',
   E'여러 줄 피드 글이다.\n\n둘째 문단.\n\n셋째 문단까지 있어서 펼치기 버튼을 확인한다.',
   null, interval '2 days'),
  ('post-dev201', 'diary', 'private', '비공개 일기',
   E'방문자에게는 제목 대신 "일기"로만 보여야 한다.',
   null, interval '1 day'),
  ('post-dev202', 'diary', 'private', '지난달 일기',
   E'달력에서 지난달로 넘겨 확인하는 일기다.',
   null, interval '35 days'),
  ('post-dev203', 'diary', 'public', '공개 일기',
   E'공개 다이어리가 방문자에게 어떻게 보이는지 확인한다.',
   null, interval '4 days')
) as v(slug, type, visibility, title, content, category_slug, age)
on conflict (slug) do nothing;

-- 댓글: 관리자와 일반 계정이 모두 있을 때만 넣는다. 공개 아티클 하나에 댓글 2개와 대댓글 1개.
do $$
declare
  admin_id uuid;
  member_id uuid;
  target_post uuid;
  first_comment uuid;
begin
  select id into admin_id from auth.users where raw_app_meta_data -> 'is_admin' = 'true'::jsonb order by created_at limit 1;
  select id into member_id from auth.users
    where coalesce(raw_app_meta_data -> 'is_admin', 'false'::jsonb) <> 'true'::jsonb order by created_at limit 1;
  select id into target_post from public.posts where slug = 'post-dev001';

  if admin_id is null or member_id is null then
    raise notice '테스트 계정(관리자·일반)이 없어 댓글을 건너뛴다';
    return;
  end if;

  -- 닉네임이 없는 일반 계정에 닉네임 하나(18절). 다른 계정이 이미 쓰면 건너뛴다.
  update public.profiles set nickname = '테스트회원'
  where id = member_id and nickname is null
    and not exists (select 1 from public.profiles where lower(nickname) = lower('테스트회원'));

  if exists (select 1 from public.comments where post_id = target_post) then
    return;
  end if;

  insert into public.comments (post_id, author_id, content, created_at)
  values (target_post, member_id, '일반 계정이 쓴 첫 댓글입니다.', now() - interval '20 hours')
  returning id into first_comment;

  insert into public.comments (post_id, author_id, parent_id, content, created_at, author_is_admin)
  values (target_post, admin_id, first_comment, '관리자의 대댓글입니다.', now() - interval '19 hours', true);

  insert into public.comments (post_id, author_id, content, created_at)
  values (target_post, member_id, '두 번째 댓글입니다.', now() - interval '10 hours');

  update public.posts set author_id = admin_id where slug like 'post-dev%' and author_id is null;
end $$;

-- 방명록: 일반 계정의 공개글·비밀글과 관리자 답글(20261022093000). 비밀글 내용은 비밀 표에 따로 넣는다.
-- SQL Editor(postgres)로 넣으므로 트리거가 author_is_admin을 넣은 값 그대로 둔다.
do $$
declare
  admin_id uuid;
  member_id uuid;
  public_entry uuid;
  secret_entry uuid;
  secret_reply uuid;
begin
  select id into admin_id from auth.users where raw_app_meta_data -> 'is_admin' = 'true'::jsonb order by created_at limit 1;
  select id into member_id from auth.users
    where coalesce(raw_app_meta_data -> 'is_admin', 'false'::jsonb) <> 'true'::jsonb order by created_at limit 1;

  if admin_id is null or member_id is null then
    raise notice '테스트 계정(관리자·일반)이 없어 방명록을 건너뛴다';
    return;
  end if;
  if exists (select 1 from public.guestbook_entries) then
    return;
  end if;

  insert into public.guestbook_entries (author_id, content, created_at)
  values (member_id, E'블로그 잘 보고 있어요!\n자주 들를게요.', now() - interval '2 days')
  returning id into public_entry;

  insert into public.guestbook_entries (author_id, parent_id, content, created_at, author_is_admin)
  values (admin_id, public_entry, '들러 주셔서 고마워요.', now() - interval '47 hours', true);

  insert into public.guestbook_entries (author_id, is_secret, created_at)
  values (member_id, true, now() - interval '1 day')
  returning id into secret_entry;
  insert into public.guestbook_secret_contents (entry_id, content)
  values (secret_entry, '관리자님만 보세요. 비밀글입니다.');

  insert into public.guestbook_entries (author_id, parent_id, is_secret, created_at, author_is_admin)
  values (admin_id, secret_entry, true, now() - interval '23 hours', true)
  returning id into secret_reply;
  insert into public.guestbook_secret_contents (entry_id, content)
  values (secret_reply, '비밀글에 단 답글이라 작성자와 관리자만 봐요.');
end $$;
