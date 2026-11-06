# myblog 개발 규칙

개인 블로그(w-life, https://www.w-owen.com). 응답 형식·브리핑·일반 코딩 원칙은 글로벌 `~/.claude/CLAUDE.md`를 따르고, 충돌하면 이 문서가 우선한다. 진행 현황과 알려진 문제는 [로드맵](docs/plans/roadmap.md)에 있다.

## 제품 규칙

- 글 타입: `blog`(화면 이름 "아티클", `/article`), `feed`(`/feed`, 상세 화면 없음), `diary`(`/diary`).
- 공개 범위: `public`·`private`(글·카테고리 단위). 피드는 항상 `public`. 비공개 글·이미지·다이어리 본문은 관리자 외에는 어떤 경로(목록·상세·이미지·sitemap·공개 캐시)로도 보여 주지 않는다. 의도한 예외가 둘 있고 버그가 아니다. 방문자 다이어리 목록은 비공개 일기의 날짜와 slug를 제목 "일기"로 내보내고 slug마다 안내 화면을 만든다(달력에 일기를 쓴 날이 드러나고, 제목·본문은 나가지 않는다). 비공개 카테고리의 `public` 글은 방문자에게 보이지 않지만 이미지는 공개 버킷에 남는다(버킷은 글의 공개 범위만 본다, 로드맵 19절).
- 쓰기(글·카테고리·이미지)는 관리자만 한다. 댓글 화면은 아티클 상세뿐이다. 공개 글의 댓글은 누구나 읽고 로그인 사용자가 쓴다. 비공개 글의 댓글은 관리자만 읽고 쓰고, 비공개 카테고리 글의 댓글은 RLS가 관리자까지 막는다. 피드는 댓글 화면이 없고 다이어리는 댓글이 없다. 대댓글은 한 단계다.
- 경로 타입과 글 타입이 다르면 404다.

## 금지선

- 사용자의 미커밋·스테이징 변경을 `git restore`·`checkout`·`stash`로 치우지 않는다.
- 비밀값(`.env*`)을 읽거나 쓰거나 커밋하지 않는다(`.claude/settings.json`이 읽기·쓰기를 막는다). 변수 이름만 `.env.example`에 적는다.
- `git push`는 Vercel 운영 배포다. 사용자가 요청할 때만 한다. `--no-verify`와 히스토리 수정(`amend`·`rebase`·`reset`)도 요청할 때만.
- `supabase/migrations/`의 커밋된 SQL은 고치지 않고 새 파일로 추가한다.
- Supabase 프로젝트는 둘이다. MCP로 DB를 다룰 때 기본 대상은 개발 `myblog-dev`(`admadefdkybuvklpezht`)이고, 운영 `myblog`(`mgyoglaujbxfbuxxlcfj`)에는 읽기 전용 조회와 사용자가 확인한 마이그레이션 적용만 한다.

## 작업 방식

- 큰 기능·구조 변경은 로드맵에 짧은 계획을 쓰고 확인받은 뒤 구현한다.
- 로직(`lib/`·라우트 핸들러·미들웨어)을 바꾸면 테스트를 같이 쓴다. 버그는 재현 테스트를 먼저 쓰고 실패를 확인한 뒤 고친다. 화면 마크업·스타일은 테스트 대신 브라우저로 확인한다.
- 테스트는 소스 옆 `<이름>.test.ts(x)`, 제목은 한국어다. Supabase 클라이언트와 `next/headers`·`next/navigation`·`next/cache`는 `vi.mock`으로 바꾼다. 화면 테스트는 첫 줄에 `// @vitest-environment jsdom`.
- 끝내기 전에 `npm run lint && npm run typecheck && npm test`. `npm run build`는 DB에 접속해야 통과하므로, 접속 불가로 실패하면 그대로 보고한다.
- 커밋은 `commit` 스킬로 한다(한국어 Conventional Commit).
- DB 구조 변경: `supabase/migrations/`에 새 파일을 쓰고, Supabase MCP `apply_migration`으로 개발 프로젝트에 먼저 적용해 확인한 뒤 사용자 확인을 받고 운영에 적용한다. 개발용 가짜 데이터는 `supabase/seed.sql`이다(운영에는 넣지 않는다).

## 명령어

```bash
npm run dev                            # http://localhost:2025
npm test                               # vitest run
npx vitest run lib/markdown.test.ts    # 파일 하나
npm run lint && npm run typecheck
npm run build                          # next build --webpack (Turbopack 제한으로 고정)
```

## 구조

- Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4, next-themes, sonner, lucide-react. 경로 별칭 `@/*`는 저장소 루트다.
- 본문: 마크다운으로 저장한다. 렌더링은 `lib/markdown.ts`의 `renderMarkdown`(markdown-it, `html: false` + 형광펜 `==`·밑줄 `++`·수식 KaTeX) 하나이고, 화면은 `MarkdownContent`로 그린다. raw HTML을 끄는 것이 본문 XSS 방어이므로 `html: true`나 `rehype-raw`류로 바꾸지 않는다. 클라이언트 컴포넌트에서 렌더러를 import하지 않는다(공개 번들에 markdown-it·KaTeX가 실린다). 서버에서 만든 본문을 props로 넘긴다(예: `FeedCard`). 쓰기 화면은 공개 번들이 아니라서 `lib/markdown`을 쓴다(작성 칸의 표 위젯, `PostEditor`의 피드 자동 제목). 자동 링크는 `https://`가 없으면 `com`·`net`·`org`·`kr` 주소만 잇고, 주소 끝에 붙은 한글은 호스트 뒤에서 끊는다.
- 본문 규격: 글자·간격·들여쓰기 값은 `app/globals.css`의 `--md-*` 한 벌을 글 화면(`.markdown-body`)과 작성 칸(`.markdown-editor`)이 같이 쓴다. 어느 쪽 모양을 바꾸든 두 곳을 같이 고치고, 같은 원문을 두 화면에 띄워 글자 위치를 비교한다. 블록 사이는 쓴 빈 줄만큼만 벌어지고 빈 줄 하나가 한 칸(`--md-line`)이다. `renderMarkdown`이 블록 앞 빈 줄 수를 `margin-top`으로 넣는다. 피드는 `markdown-compact` 크기다.
- 글 쓰기 화면: `PostEditor`가 값을 들고, 임시저장은 `usePostDraft`, 공개 범위·카테고리·이미지·발행은 `<dialog>`인 `PostSettingsPanel`이다. 카테고리 선택지는 페이지가 서버에서 읽어 넘긴다. 수정 화면은 연 글의 `updated_at`을 `savePost`에 넘기고, DB 값과 다르면 저장하지 않는다(옛 탭이 다른 기기의 수정과 사진을 지우지 않게). 그래서 `updated_at`을 바꾸지 않아야 할 쓰기(조회수)는 트리거에서 뺀다.
- 에디터: `MarkdownEditor`(CodeMirror 6 + 툴바, 미리보기 패널 없이 작성 칸에 바로 서식을 보인다). 작성 칸은 `lib/markdown-syntax.ts`(Lezer 파서, `==`·`++`·`$`, 강조 여닫기는 글 화면처럼 cjk-friendly 규칙)로 읽고 `lib/markdown-live-preview.ts`가 기호를 커서 위치와 상관없이 숨기거나 위젯으로 바꾸고, 숨긴 기호는 커서가 한 덩어리로 건너뛴다. 원문을 드러내는 곳은 커서가 링크 안에 있을 때의 링크와 커서 줄의 수식·표다. 코드 펜스와 Setext 밑줄은 늘 흐린 글자로 남고, 줄머리 기호는 공백을 치기 전까지 커서 줄에 보인다. 목록은 줄을 `display: list-item`으로 그려 점·번호가 글 화면과 같은 모양으로 나온다. 줄에는 세로 `margin`을 쓰지 않는다(CodeMirror가 높이를 못 잰다). 기호 앞뒤는 화면에서 같은 자리로 보이므로 `lib/markdown-hidden-marks.ts`가 트랜잭션 단계에서 커서를 문법이 깨지지 않는 쪽에 세우고 줄바꿈·지우기가 서식을 가르지 않게 다듬는다. 글 화면 렌더러와 파서가 다르므로 본문 문법을 늘리면 markdown-it 플러그인과 Lezer 설정에 같이 넣고, `INLINE_STYLES`(`lib/markdown-live-preview.ts`)·`INLINE_MARKS`(`lib/markdown-hidden-marks.ts`)·글 화면과 작성 칸 CSS·툴바도 같이 고친다. 툴바 동작은 `lib/markdown-edit.ts`의 순수 함수다. 본문 이미지는 글의 공개 범위 버킷으로 올라가고 `![](<버킷>:<경로>)`로 들어간다. 크기·정렬은 주소 끝 조각(`#w=60&align=center`, `lib/image-options.ts`)에 담고, 렌더러는 검증한 값만 style·class로 옮긴다. 작성 칸 이미지는 누르면 선택되고 툴바·크기 손잡이가 뜬다(`lib/markdown-image-widget.ts`).
- 공개 화면(홈·아티클·피드·다이어리 목록과 상세, 댓글, sitemap, `/rss.xml`)은 쿠키를 읽지 않아 정적·ISR이다. `lib/server/publicPosts.ts`가 anon 키로 PostgREST를 `fetch`하고 태그 캐시(`posts:public:<type>`, 하루)를 건다. 방문자 다이어리 목록만 service role로 본문 없이 읽어 `unstable_cache`한다(`getPublicDiaryIndex`).
- 검색(`/search?q=`, 동적·쿠키 없음, noindex): 공개 아티클만 `lib/server/publicSearch.ts`가 `fetchPublicRest`로 제목·본문 `imatch`(최근 50개, 아티클 태그 캐시). PostgREST는 `ilike` 값의 `*`를 `%`로 바꿔 쓰지 않는다. 검색어 정리·필터 이스케이프는 `lib/search.ts`의 순수 함수이고, 헤더·모바일 입력은 `form GET`(`name=q`)이다.
- 다이어리 목록: 날짜 계산은 `lib/diaryCalendar.ts`(브라우저 시간대를 쓰지 않는 한국 날짜)다. 보는 달과 날짜는 주소(`?year=&month=&date=`)가 정하고, 주소에 없으면 탭 저장소의 마지막 값, 그것도 없으면 이번 달이다. 바꿀 때는 `history.replaceState`만 쓴다(서버 재요청 없음).
- 조회수: 아티클 상세는 정적이고, 말단 `ViewCount`가 마운트 뒤 `/api/views`에 탭 세션당 한 번 POST해 숫자를 바꾼다. 라우트는 draft mode·봇이면 204, 공개 아티클이 아니면(비공개·없음 모두) 404, 응답은 `no-store`다. 다이어리·피드는 세지 않는다.
- 피드 카드: 상세 화면이 없어 카드가 글의 전부다. 서버의 `feedCardContent`가 첨부 전체(없으면 본문 첫 공개 이미지)를 카드에 올리고 그 사진을 화면에 넘기는 본문에서 뺀다. 두 줄 자르기와 `더 보기`는 요약에 안 담기는 내용이 있을 때만 켠다.
- RSS(`/rss.xml`, `lib/rss.ts`): 최근 공개 아티클 30개의 요약. 루트 메타데이터 `alternates.types`로 모든 페이지 head에 알린다.
- 댓글 메일 알림: `createComment`가 관리자 외 댓글·답글을 저장·무효화한 뒤 `after()`로 `lib/server/notify.ts`를 부른다. Resend HTTP API에 text 본문만 보내고(사용자 입력을 HTML에 넣지 않는다), `RESEND_API_KEY`·`COMMENT_NOTIFY_EMAIL`이 없으면 건너뛰며, 발송 실패는 댓글 쓰기를 실패로 돌리지 않는다. 새 방명록도 같은 모듈로 알리되 비밀글 내용은 메일에 싣지 않는다.
- 방명록(`/guestbook`, 정적·ISR, 태그 `guestbook`): 로그인 사용자가 쓰고, 답글은 관리자만 한 단계, 수정은 없고 본인·관리자가 지운다.
  - 비밀글 내용은 `guestbook_secret_contents`에만 둔다(`guestbook_entries.content`는 null). 관리자·작성자·(답글이면) 원글 작성자만 RLS로 읽고 anon은 권한이 없다. 공개 조회(`getPublicGuestbook`)에 이 표를 넣지 않는다.
  - 방문자 화면의 본인 비밀 내용은 `GuestbookThread`가 브라우저 세션으로 채우고, 관리자는 draft mode에서 `getGuestbookDirectly`로 받는다.
  - 쓰기는 `create_guestbook_entry`(security invoker, 두 표를 한 트랜잭션으로)다. 규칙은 RLS WITH CHECK에 있어 PostgREST 직접 insert에도 같이 걸린다. 이름·사진 변경과 탈퇴 때 `revalidateGuestbook()`을 부른다.
- 관리자 화면: draft mode다. 토글은 없고 관리자 세션이 있는 동안 늘 켜 둔다. 로그인할 때 켜고(`LoginForm`), 로그아웃 때 끄고, 글을 저장하면 켠다. 그 밖에는 `SiteHeader`가 `draftMode()`로 읽은 값(정적 생성 때는 false)을 `AdminModeSync`에 넘기고, 그것이 브라우저 세션의 `is_admin`과 다르면 `lib/adminMode` → `/api/admin-mode`로 맞춘 뒤 `router.refresh()`한다. draft 쿠키는 브라우저 세션 쿠키라 로그인이 남은 채 브라우저를 다시 열면 첫 화면은 방문자 화면이 잠깐 보인 뒤 바뀐다. 공개 페이지는 `getPreviewViewer()`로 draft mode일 때만 세션을 읽어 비공개 글·관리 버튼을 동적으로 그린다. 공개 페이지에서 `getViewer()`를 직접 부르지 않는다(정적이 깨진다).
- `/article` 목록은 경로 기반이다(`/article/page/[n]`, `/article/category/[slug]`, `/article/category/[slug]/page/[n]`, 링크는 `articleListHref`). 옛 `?category=`·`?page=` 주소는 `proxy.ts`가 308로 보낸다.
- 관리자 조회: `lib/server/posts.ts`가 쿠키 세션 서버 클라이언트(RLS 적용)로 읽는다. 아티클 목록의 카테고리만 `ArticleIndex`가 같은 클라이언트로 직접 읽는다.
- 쓰기: `lib/actions/*.ts` 서버 액션. 입력은 zod로 검증한다. 반환은 `{ success: true, … } | { success: false, error }`이고, DB·Storage 오류는 원문을 돌려주지 않고 `dbFailure`(`lib/server/dbFailure.ts`)로 서버 로그에 남긴다. 성공하면 `revalidatePublicPosts`로 공개 캐시(태그·경로)를 무효화한다. 댓글 쓰기·삭제도 그 글의 상세를 무효화한다. 태그는 `updateTag`로 바로 만료하므로 서버 액션에서만 부른다(`revalidateTag(tag, profile)`는 쓴 직후 첫 방문자에게 이전 내용을 준다). 목록 페이지가 route group 안에 있어 `revalidatePath`는 `type` 없이 주소로 부른다.
- 이미지: `app/api/images` 라우트 핸들러가 service role로 Storage에 올리고 내려준다. 키 형식은 `<버킷>:<경로>`. 비공개 버킷 응답은 `Cache-Control: private, no-store`이고, SVG는 올리지 않는다. 버킷은 올리는 순간의 공개 범위로 정해지므로, 글을 저장할 때 `savePost`가 글 공개 범위와 다른 버킷의 파일(본문·첨부·썸네일)을 같은 경로로 옮기고 키를 바꾼다(피드는 공개). 글을 지우거나 수정해 뺀 이미지는 저장·삭제 뒤 `removeUnusedImages`가 지운다. 다른 글이 같은 키를 쓰면 남기고, 실패해도 글 작업은 성공이며 서버 로그에만 남는다. 저장하지 않고 버린 업로드는 남는다. `next/image` 변환기는 쿼리 없는 로컬 주소와 내 프로젝트의 공개 저장소 주소만 받는다(`next.config.ts`). 변환기는 쿠키를 보내지 않으므로 `/api/images` 주소는 `unoptimized`로 뺀다(`isImageProxySrc`).
- DB 타입: `lib/supabase/database.types.ts`는 생성 파일이라 고치지 않는다. 구조를 바꾸면 MCP `generate_typescript_types`(개발 프로젝트)로 통째로 다시 만든다. 클라이언트는 `type`·`visibility`를 좁힌 `lib/supabase/database.ts`의 `Database`를 쓴다. 생성 타입은 외래 키만 보므로 RLS가 가린 임베드가 null로 오는 경우를 나타내지 못한다.
- 카테고리: 이름 변경은 외래 키 `on update cascade`로 한 문장이고, 삭제·순서 변경은 DB 함수 `delete_category`·`move_category`(service role만 호출)다. 새로 만들 때는 `ensureCategory`(`lib/server/categories.ts`)가 이름 규칙을 본다.
- Supabase 클라이언트: `lib/supabase/server.ts`(서버, RLS 적용), `client.ts`(브라우저), `service.ts`(서버 전용, RLS 우회 — `assertAdmin` 뒤에만. 예외 넷: 방문자 다이어리 목록의 본문 없는 조회, 회원 탈퇴 `deleteAccount`의 본인 계정 삭제, `/api/views`의 `increment_post_view` 호출(anon 조회로 공개 아티클임을 확인한 뒤), `/api/images` GET의 공개 버킷 파일 내려주기). 개발 서버는 `next.config.ts`가 `lib/supabase/devGuard.ts`로 운영 주소를 막는다(빌드·`next start`는 판정하지 않는다).
- 인증: Supabase Auth(이메일·비밀번호). 관문은 `lib/server/admin.ts`다. 화면 분기는 `getViewer()`(user·isAdmin), 페이지 접근은 `requireLogin`·`requireAdmin`(redirect), 서버 액션·라우트 핸들러는 `assertAdmin()`(실패를 돌려줌). 관리자는 `app_metadata.is_admin`(JSON `true`)만 보고, RLS의 `is_admin()`도 JWT의 같은 값을 본다. 관리자 지정은 SQL Editor(service role)로 `auth.users.raw_app_meta_data`에 `is_admin: true`를 넣고 다시 로그인한다(RLS는 토큰이 갱신돼야 반영). `proxy.ts`는 `sb-` 쿠키가 있을 때 세션 갱신만 한다. 화면 전환 요청(`rsc` 헤더)에서는 돌지 않고, 그때 토큰은 열린 탭의 브라우저 클라이언트가 갱신한다.
- 마이페이지(`/mypage`, `requireLogin`·동적): 닉네임·프로필 사진, 내 댓글, 비밀번호 변경, 회원 탈퇴(관리자는 못 한다). 헤더는 로그인하면 아바타가 여기로 간다.
  - 표시: 관리자는 프로필과 상관없이 오웬 로고·Owen이다. 다른 사용자는 닉네임·사진, 없으면 `사용자 <id 앞 6자>`·사람 아이콘이다(`userDisplayName`·`UserAvatar`). 정적 댓글 목록은 `auth.users`를 못 읽으므로 `comments.author_is_admin`(INSERT 트리거가 쓰는 사람의 JWT로 채움)과 `author:profiles(nickname,avatar_path)` 임베드를 본다.
  - `profiles`: 누구나 읽고 본인 행의 두 열만 고친다. 가입 트리거가 `raw_user_meta_data.nickname`으로 행을 만든다(가입 폼은 중복확인 `check_nickname`을 거친다). 닉네임 규칙은 DB(`nickname_problem`)와 `lib/nickname.ts`가 같아야 한다.
  - 사진: 브라우저가 256px JPEG로 줄여 `avatars` 버킷의 본인 폴더에 새 uuid 이름으로 올리고(Storage 정책), 서버 액션이 확인해 저장한 뒤 이전 파일을 지운다. Storage 파일은 계정과 함께 지워지지 않으므로 탈퇴·되돌리기에서 직접 지운다.
  - 이름·사진이 바뀌면 그 사람이 댓글을 단 글을 무효화한다(`getCommentedPosts`·`revalidateCommentedPosts`). 관리자는 댓글의 "프로필 초기화"(`resetUserProfile`)로 닉네임·사진을 되돌린다.
- ISR: 라우트 세그먼트 `revalidate`는 리터럴이어야 하므로 `86400 // REVALIDATE_PERIOD`로 쓴다.
- 일시정지 방지: `/api/cron/keep-alive`(Vercel Cron 하루 1회, `CRON_SECRET`)가 캐시하지 않는 조회로 DB 활동을 남긴다(무료 플랜 7일 무활동 일시정지).

## 규약

- 식별자·코드는 영어, 주석·화면 문구·테스트 제목은 한국어. 주석은 "왜"만 쓴다.
- 새 `any`·`@ts-ignore`를 쓰지 않는다. 입력 검증은 서버 액션·라우트 핸들러 경계에서 zod로 한다.
- RSC 우선: `"use client"`는 브라우저 API·상태가 필요한 말단 컴포넌트에만. 서버 전용 모듈은 `import "server-only"`.
- 조회는 필요한 열만 고르고 관계 count(`comments(count)`)로 N+1을 피한다.
- UI: Tailwind v4 문법(`bg-linear-to-*` 등), 디자인 토큰은 `app/globals.css`. 상태 색은 `success`·`warning`·`danger` 토큰, 버튼은 `ui.tsx`의 `Button`·`ButtonLink`·`buttonClass`, 아이콘은 lucide-react, 클래스 조합은 `cn`이다. `dark:`는 OS 설정이 아니라 html의 `.dark`를 따른다. 다크 모드와 모바일 폭을 확인한다.
