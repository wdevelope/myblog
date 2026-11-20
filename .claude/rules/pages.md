---
paths:
  - "app/**"
  - "proxy.ts"
  - "lib/server/publicPosts.ts"
  - "lib/server/publicSearch.ts"
  - "lib/search.ts"
  - "lib/diaryCalendar.ts"
  - "lib/rss.ts"
  - "lib/adminMode.ts"
  - "lib/**/guestbook.ts"
  - "lib/**/account.ts"
  - "lib/actions/profile.ts"
  - "lib/nickname.ts"
  - "lib/avatar.ts"
---
# 화면 규칙 (CLAUDE.md 구조)

## 공개 화면
- 공개 화면(홈·아티클·피드·다이어리 목록과 상세, 댓글, sitemap, `/rss.xml`)은 쿠키를 읽지 않아 정적·ISR이다. `lib/server/publicPosts.ts`가 anon 키로 PostgREST를 `fetch`하고 태그 캐시(`posts:public:<type>`, 하루)를 건다. 방문자 다이어리 목록만 service role로 본문 없이 읽어 `unstable_cache`한다(`getPublicDiaryIndex`).
- ISR: 라우트 세그먼트 `revalidate`는 리터럴이어야 하므로 `86400 // REVALIDATE_PERIOD`로 쓴다.
- `/article` 목록은 경로 기반이다(`/article/page/[n]`, `/article/category/[slug]`, `/article/category/[slug]/page/[n]`, 링크는 `articleListHref`). 옛 `?category=`·`?page=` 주소는 `proxy.ts`가 308로 보낸다.
- 검색(`/search?q=`, 동적·쿠키 없음, noindex): 공개 아티클만 `lib/server/publicSearch.ts`가 `fetchPublicRest`로 제목·본문 `imatch`(최근 50개, 아티클 태그 캐시). PostgREST는 `ilike` 값의 `*`를 `%`로 바꿔 쓰지 않는다. 검색어 정리·필터 이스케이프는 `lib/search.ts`의 순수 함수이고, 헤더·모바일 입력은 `form GET`(`name=q`)이다.
- 다이어리 목록: 날짜 계산은 `lib/diaryCalendar.ts`(브라우저 시간대를 쓰지 않는 한국 날짜)다. 보는 달과 날짜는 주소(`?year=&month=&date=`)가 정하고, 주소에 없으면 탭 저장소의 마지막 값, 그것도 없으면 이번 달이다. 바꿀 때는 `history.replaceState`만 쓴다(서버 재요청 없음).
- 조회수: 아티클 상세는 정적이고, 말단 `ViewCount`가 마운트 뒤 `/api/views`에 탭 세션당 한 번 POST해 숫자를 바꾼다. 라우트는 draft mode·봇이면 204, 공개 아티클이 아니면(비공개·없음 모두) 404, 응답은 `no-store`다. 다이어리·피드는 세지 않는다.
- 피드 카드: 상세 화면이 없어 카드가 글의 전부다. 서버의 `feedCardContent`가 첨부 전체(없으면 본문 첫 공개 이미지)를 카드에 올리고 그 사진을 화면에 넘기는 본문에서 뺀다. 두 줄 자르기와 `더 보기`는 요약에 안 담기는 내용이 있을 때만 켠다.
- RSS(`/rss.xml`, `lib/rss.ts`): 최근 공개 아티클 30개의 요약. 루트 메타데이터 `alternates.types`로 모든 페이지 head에 알린다.

## 관리자 화면
- draft mode다. 토글은 없고 관리자 세션이 있는 동안 늘 켜 둔다. 로그인할 때 켜고(`LoginForm`), 로그아웃 때 끄고, 글을 저장하면 켠다.
- 그 밖에는 `SiteHeader`가 `draftMode()`로 읽은 값(정적 생성 때는 false)을 `AdminModeSync`에 넘기고, 그것이 브라우저 세션의 `is_admin`과 다르면 `lib/adminMode` → `/api/admin-mode`로 맞춘 뒤 `router.refresh()`한다. draft 쿠키는 브라우저 세션 쿠키라 로그인이 남은 채 브라우저를 다시 열면 첫 화면은 방문자 화면이 잠깐 보인 뒤 바뀐다.
- 공개 페이지는 `getPreviewViewer()`로 draft mode일 때만 세션을 읽어 비공개 글·관리 버튼을 동적으로 그린다. 공개 페이지에서 `getViewer()`를 직접 부르지 않는다(정적이 깨진다).

## 방명록
- `/guestbook`, 정적·ISR, 태그 `guestbook`. 로그인 사용자가 쓰고, 답글은 관리자만 한 단계, 수정은 없고 본인·관리자가 지운다.
- 비밀글 내용은 `guestbook_secret_contents`에만 둔다(`guestbook_entries.content`는 null). 관리자·작성자·(답글이면) 원글 작성자만 RLS로 읽고 anon은 권한이 없다. 공개 조회(`getPublicGuestbook`)에 이 표를 넣지 않는다.
- 방문자 화면의 본인 비밀 내용은 `GuestbookThread`가 브라우저 세션으로 채우고, 관리자는 draft mode에서 `getGuestbookDirectly`로 받는다.
- 쓰기는 `create_guestbook_entry`(security invoker, 두 표를 한 트랜잭션으로)다. 규칙은 RLS WITH CHECK에 있어 PostgREST 직접 insert에도 같이 걸린다. 이름·사진 변경과 탈퇴 때 `revalidateGuestbook()`을 부른다.

## 마이페이지
- `/mypage`, `requireLogin`·동적. 닉네임·프로필 사진, 내 댓글, 비밀번호 변경, 회원 탈퇴(관리자는 못 한다). 헤더는 로그인하면 아바타가 여기로 간다.
- 표시: 관리자는 프로필과 상관없이 오웬 로고·Owen이다. 다른 사용자는 닉네임·사진, 없으면 `사용자 <id 앞 6자>`·사람 아이콘이다(`userDisplayName`·`UserAvatar`). 정적 댓글 목록은 `auth.users`를 못 읽으므로 `comments.author_is_admin`(INSERT 트리거가 쓰는 사람의 JWT로 채움)과 `author:profiles(nickname,avatar_path)` 임베드를 본다.
- `profiles`: 누구나 읽고 본인 행의 두 열만 고친다. 가입 트리거가 `raw_user_meta_data.nickname`으로 행을 만든다(가입 폼은 중복확인 `check_nickname`을 거친다). 닉네임 규칙은 DB(`nickname_problem`)와 `lib/nickname.ts`가 같아야 한다.
- 사진: 브라우저가 256px JPEG로 줄여 `avatars` 버킷의 본인 폴더에 새 uuid 이름으로 올리고(Storage 정책), 서버 액션이 확인해 저장한 뒤 이전 파일을 지운다. Storage 파일은 계정과 함께 지워지지 않으므로 탈퇴·되돌리기에서 직접 지운다.
- 이름·사진이 바뀌면 그 사람이 댓글을 단 글을 무효화한다(`getCommentedPosts`·`revalidateCommentedPosts`). 관리자는 댓글의 "프로필 초기화"(`resetUserProfile`)로 닉네임·사진을 되돌린다.
