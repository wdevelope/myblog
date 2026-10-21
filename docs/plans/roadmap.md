# 로드맵

- **작성:** 2026-10-21
- **근거:** 운영 재개 준비 중 코드 검토 결과, 사용자 결정(2026-10-21: MongoDB 전환을 철회하고 Supabase를 유지, 리전 정렬·ISR 복구를 앞당김, 전체 리팩터링 진행, 도메인은 나중에 구입, 배포는 Vercel)

이전 `tasklist.md`를 대체한다. 끝난 단계는 `[x]`로 바꾸고 한 줄 결과를 남긴다.

## 진행 현황

- [x] 0. Claude 기본 세팅 — CLAUDE.md, `.env` 접근 차단, Vitest, CI(lint·typecheck·test), commit 스킬
- [ ] 1. Supabase 백업과 운영 주소 정리 (사용자 작업)
- [x] 2. 관리자 판정 보안 수정과 인증 관문 정리 — `getViewer`·`assertAdmin`, `proxy.ts`, 같은 출처 리다이렉트, GET `/logout` 제거, 회귀 테스트 38개(2026-10-21). 배포 전 확인 완료, 그 과정에서 찾은 보안 11은 마이그레이션으로 막음(2026-10-22, 2절)
- [ ] 3. 리전 정렬
- [x] 4. 기반 정리와 테스트 안전망 — `getPostForRoute`·`loadPostForEdit`, `revalidatePublicPosts`, `formatPostDate`(KST)·`coverKeyOf`, `postHref`·`SITE_URL`, 로딩 route group, 행 매핑 분리(2026-10-22, 테스트 파일 15개·82개)
- [ ] 5. ISR 복구와 일시정지 방지
- [ ] 6. DB 타입과 쓰기 액션 정리
- [ ] 7. UI 통일과 큰 컴포넌트 분할
- [x] 8. 에디터 교체와 본문 보안 (CKEditor → 마크다운) — 마크다운 렌더러·원문 편집 에디터, 기존 글 135개 변환, 비공개 이미지 `private, no-store`·SVG 차단, CKEditor 제거(2026-10-22)

## 진행 원칙 (2~8단계)

- 순서: 보안(2) → 체감 속도(3·5) → 코드 품질(6~8). 4단계는 5단계가 기댈 조회·무효화·공용 규칙을 먼저 모으는 선행 작업이다.
- 단계를 시작할 때 그 단계의 짧은 계획을 확인받는다. 동작이 바뀌지 않는 정리와 동작 변경(버그 수정)은 커밋을 나눈다.
- 공통화는 실제로 두 곳 이상 같은 코드만 한다. 세 글 타입의 목록 화면(그리드·카드·달력)은 구성이 달라 합치지 않는다.

## 1. Supabase 백업과 운영 주소 정리

- 2026-10-21 오전에는 `mgyoglaujbxfbuxxlcfj.supabase.co`가 DNS에서 조회되지 않았고(NXDOMAIN), 같은 날 오후에는 REST 엔드포인트가 401로 응답한다(프로젝트 활성). 대시보드에서 상태를 확인한다.
- `pg_dump`로 스키마·데이터를, Storage 버킷(`post-images-public`·`post-images-private`) 파일을 백업한다. 기본 스키마가 저장소에 없어서 덤프가 유일한 원본이다.
- 2단계 수정은 로컬 main에만 있고 아직 배포 전이다. 배포 전까지 운영 중인 Vercel 배포는 보안 1~4가 열린 상태다.
- 도메인: `w-life.store`는 만료됐고(2026-10-21 whois 등록 가능) 나중에 새로 산다. 그때까지 Vercel 기본 주소(`*.vercel.app`)로 운영한다. Vercel 환경변수 `NEXT_PUBLIC_SITE_URL`과 Supabase Auth의 Site URL·Redirect URLs를 그 주소로 맞춘다(sitemap·robots·메타데이터·로그인 리다이렉트 기준). 도메인을 사면 같은 곳과 CLAUDE.md·README 주소를 바꾼다.
- 10/30 PostgREST GRANT 변경(2026-10-22 확인, Supabase 문서 "Securing your API"): `public`에 새로 만드는 테이블·함수에 `anon`·`authenticated`·`service_role` 권한을 자동으로 주던 기본 권한(default privileges)을 끄는 변경이다. 이미 있는 객체의 권한은 그대로라 지금 앱이 쓰는 `posts`·`categories`·`comments`·`users`와 함수 `is_admin`·`increment_post_view`·`set_updated_at`는 영향이 없다(모든 테이블 RLS 켜짐). 앞으로 새 테이블·함수를 만드는 마이그레이션에는 `grant`를 직접 쓴다(빠지면 PostgREST가 `42501`). 날짜(10/30)는 외부 자료 기준이다.

## 2. 관리자 판정 보안 수정과 인증 관문 정리

- 대상: 알려진 문제 보안 1~4, 9. `lib/server/admin.ts`, `proxy.ts`(구 `middleware.ts`), 로그인 폼·`/auth/callback` 리다이렉트, 로그아웃.
- 방향: 관리자 판정은 `auth.getUser()`로 검증한 사용자의 `app_metadata.is_admin` 또는 `public.users.is_admin`만 본다. 요청 헤더·`user_metadata`는 보지 않는다. 미들웨어는 세션 갱신만 한다. 리다이렉트는 같은 출처 경로만 허용한다. 각각 회귀 테스트를 같이 쓴다.
- 관문 API 정리: 인자 없는 `getViewer()`(user·isAdmin)와 실패를 돌려주는 `assertAdmin()`(서버 액션·라우트 핸들러용)으로 나눈다. 지금은 `requireAdmin`이 액션 안에서도 redirect하고, 댓글 액션은 `"unauthorized"`를 돌려주고, 이미지 GET은 401 대신 로그인으로 보낸다. 페이지는 지금처럼 `requireAdmin`(redirect)을 쓴다.
- 미들웨어는 `proxy.ts`로 이름을 바꾸고 `sb-` 쿠키가 없으면 클라이언트를 만들지 않는다. 로그아웃은 GET 라우트를 지우고 브라우저 `signOut()` 하나로 한다.
- 테스트: 이 단계에서 Supabase 클라이언트 mock을 만들고 4단계에서 넓힌다.
- 배포 전 확인(2026-10-22, Supabase MCP 읽기 전용 조회): 관리자 계정 1개가 `app_metadata.is_admin`과 `users.is_admin` 모두 `true`이고 `user_metadata`에 플래그가 있는 계정은 없다. `is_admin()`은 `public.users.is_admin`만 읽는다. 다만 `users`의 자기 행 쓰기 정책 때문에 누구나 자기 `is_admin`을 바꿀 수 있어(보안 11) `20261022010000_lock_users_admin_flag.sql`로 막고 운영 DB에 적용했다.

## 3. 리전 정렬

- 2026-10-22: `vercel.json`에 `regions: ["icn1"]`을 넣었다. Supabase 리전이 `ap-northeast-2`(서울)이고 Vercel 함수 기본 리전은 `iad1`(워싱턴)이다. Hobby도 리전 하나는 고를 수 있다.
- 남은 일: 배포한 뒤 vercel.app 주소로 `/`·`/article`·상세 하나의 TTFB를 재고 응답 헤더 `x-vercel-id`에 `icn1`이 찍히는지 본다. 5단계와 비교할 기준으로 남긴다. 바꾸기 전 기준값은 운영 주소를 몰라 재지 못했다(Vercel MCP에서 이 프로젝트가 보이지 않는다).

## 4. 기반 정리와 테스트 안전망

- 완료(2026-10-21, 2단계와 병렬 진행): `server-only` 적용(`lib/supabase/service.ts`·`server.ts`, `lib/server/admin.ts`·`posts.ts`)과 service role 키를 `service.ts`로 분리, `CommentForm` 삭제, `HtmlContent` 서버 컴포넌트화와 본문 전용 CSS(`ckeditor5-content.css`), `publicPosts.ts` 현행 동작 테스트.
- 완료(2026-10-22)
  - 동작 불변: `mapPost`·`PostRow`를 `lib/server/postRow.ts`로 분리, 조회 함수의 안 쓰는 인자(`user`·`category`·`limit`·`offset`)와 `uuid()` 폴백·`coverSrcFromImageKey` 중복·빈 `app/feed/[slug]/` 제거, `SITE_URL`·`postHref`(`lib/constants.ts`)와 이미지 버킷 상수(`lib/image.ts`).
  - 로딩 범위: 홈·목록의 page·loading을 `(home)`·`(list)` route group으로 옮기고 홈 스켈레톤 중복을 `LatestArticlesSkeleton`으로 합침.
  - 버그 수정(테스트 먼저): `getPostForRoute`·`loadPostForEdit`로 상세·수정 404 통일과 로그인 후 수정 화면 복귀, `revalidatePublicPosts`로 무효화 통합(`/article`·상세 경로, 옛 카테고리), `formatPostDate`(KST)·`coverKeyOf`(썸네일 → 첫 이미지).
- 계획과 달라진 점
  - `postHref`는 글 타입에 따라 경로가 달라지는 곳(캐시 무효화, 저장 후 이동)에만 쓴다. `href="/article"` 같은 고정 링크 약 50곳은 그대로 둔다.
  - 다이어리 상세의 404는 관리자에게만 적용했다. 비관리자는 RLS로 다이어리를 읽지 못해 없는 글과 비공개 글을 구분할 수 없으므로 5단계(`/diary/[slug]` 행)에서 정리한다.
  - `getComments`는 5단계 댓글 로딩에 쓸 수 있어 남겼다. `PostEditor`의 주석 처리된 코드는 7·8단계에서 함께 지운다.

## 5. ISR 복구와 일시정지 방지

- 조회를 "공개(쿠키 없음, 태그 캐시)"와 "관리자" 두 계열로 나눈다. 공개 페이지는 공개 계열만 쓴다. 비관리자 다이어리 목록(본문 가림)은 모든 비관리자에게 같으므로 쿠키 없이 캐시한다.
- 로그인 상태는 레이아웃의 `AuthProvider` 하나가 구독하고 `useViewer()`·`<AdminOnly>`로 읽는다. `AuthButton`·`MobileNav`의 중복 구독과 로그아웃 코드를 합친다. 서버 액션의 권한 검사는 그대로 둔다.

  | 경로 | 지금 동적인 이유 | 할 일 |
  |---|---|---|
  | `/` | 없음 | 빌드 출력으로 정적인지 확인 |
  | `/feed` | `getViewer`(쿠키)·쿠키 조회 | `getPublicPosts`로 교체. `FeedCard`를 서버 컴포넌트로 바꾸고 펼치기·관리자 메뉴만 클라이언트로, 더미 좋아요·댓글 제거 |
  | `/article/[slug]` | 같음 + 단건·댓글 쿠키 조회 | anon 단건 조회와 `generateStaticParams`. 수정·삭제 메뉴와 댓글을 클라이언트 말단으로, `generateMetadata` 추가 |
  | `/diary` | 같음 + 쿠키 조회 | 비관리자 조회를 쿠키 없이. `DiaryIndexClient`를 `<Suspense>`로 감싸고(`useSearchParams`) 필요한 필드만 넘김 |
  | `/diary/[slug]` | 같음 | 공개만 anon 조회, 비공개는 404 |
  | `/article` | 같음 + `searchParams`·카테고리 쿠키 조회 | 아래 결정 1 |

- 공개 fetch의 revalidate 기본값 60초를 세그먼트와 같은 86400초로 맞춘다(태그 무효화가 있다). 댓글 액션도 `revalidatePublicPosts`로 무효화한다(글 액션은 4단계에서 상세 경로까지 무효화한다).
- 착수 전에 정할 것
  1. `/article`: (a) 카테고리를 지금 리다이렉트만 하는 `/article/category/[slug]` 경로로, 페이지 번호도 경로로 옮겨 정적화한다. (b) 쿼리 문자열을 유지하고 데이터 캐시만 한다(동적 렌더링).
  2. 관리자에게 비공개 글을 공개 목록에 섞어 보일지, 관리자 전용 경로로 분리할지.
- 확인: `next build` 출력에서 위 경로가 정적·ISR로 나오는지, 배포 뒤 `x-vercel-cache: HIT`인지, 3단계 TTFB와 비교한다.
- 일시정지 방지: ISR이 살면 DB 요청이 줄어 무료 플랜의 7일 무활동 일시정지 위험이 커진다. Vercel Cron(Hobby는 하루 1회)으로 공개 조회 함수를 부르는 라우트 핸들러를 두고 `CRON_SECRET`으로 막는다.

## 6. DB 타입과 쓰기 액션 정리

- 1단계 덤프 뒤 `supabase gen types`로 `Database` 타입을 만들어 Supabase 클라이언트 3개에 붙이고, 손으로 쓴 `PostRow`와 캐스트를 지운다. `Post`에서 `mapPost`가 늘 채우는 필드는 필수로 바꾸고, `Category` 타입은 `lib/types.ts`로 옮긴다.
- 서버 액션 입력 검증을 zod로 한다(지금 zod를 쓰는 곳이 없고 `createPost`에 손으로 쓴 검증이 약 55줄 있다). `DB Error: <원문>` 응답 약 20곳을 "로그를 남기고 일반 메시지를 돌려주는" 함수 하나로 바꾼다.
- 글: `createPost`를 실제 동작대로 `savePost`(upsert)로 바꾼다. 카테고리 자동 생성과 `createCategory`를 `ensureCategory`로 합쳐 이름 검증을 같이 쓴다. slug 중복 확인은 순차 조회(최대 5회) 대신 unique 제약 위반(23505) 때 재시도한다. 수정할 때 `author_id`를 덮어쓰지 않는다.
- 카테고리: FK가 `on update cascade`라서 `updateCategory`의 posts 수동 갱신과 보상 롤백은 필요 없다(운영 DB에 FK가 있는지 덤프로 먼저 확인). 사용 중 개수는 `posts(count)`로 센다. 이름 변경·삭제·순서 변경의 트랜잭션 문제는 새 마이그레이션의 RPC로 푼다. 새 함수는 권한이 자동으로 붙지 않으므로(1단계 GRANT 항목) 같은 마이그레이션에 `grant execute on function … to authenticated, service_role`을 쓴다.
- 댓글: 행 매핑·select·작성 가능 판정이 세 곳에 중복돼 있어 합치고, 인증은 `getViewer()`를 쓴다.

## 7. UI 통일과 큰 컴포넌트 분할

- 기계적 통일(분할 전에)
  - 아이콘은 lucide-react 하나로(react-icons 8개 파일, 직접 그린 SVG 아이콘 7곳). 클래스 조합은 `cn`으로(`.join(" ")` 7곳).
  - `ui.tsx`에 `Button` variant를 추가하고(primary 버튼 클래스 10곳 이상 반복), 하드코딩 색(약 49곳)은 `--success`·`--warning`·`--danger` 토큰으로.
  - 내비 링크 목록을 `SiteHeader`·`MobileNav` 한 곳으로 모으고 `aria-current`를 붙인다.
- 표현 컴포넌트: `PostMeta`(작성자·날짜 줄 3곳), `PostBody`, `VisibilityIcon`(5곳), `ArticleCard`·`CategorySidebar`·`Pagination`(아티클 목록 379줄에서 분리).
- 분할
  - `PostEditor`(706줄): 임시저장 `usePostDraft`, 설정 패널 `PostSettingsPanel`. 업로드 함수 통합은 8단계(에디터 교체)로 옮겼다. 카테고리는 클라이언트 조회 대신 서버에서 넘기고, 저장 중에는 버튼을 막는다.
  - `DiaryIndexClient`(584줄): 날짜 함수를 lib로 옮겨 테스트하며 KST로 통일한다. URL 동기화 effect를 없애고 `searchParams`에서 값을 바로 구한다. `DiaryCalendar`·`DiaryList`로 나눈다.
  - 완료(2026-10-21): `CategorySettingsModal`의 반복 흐름을 `run()` 하나로, 행을 `CategoryRow`로 나누고 ESC로 닫을 때 편집 상태를 초기화했다(컴포넌트 테스트 5개).
  - `CommentsThread`: 댓글·대댓글 마크업을 `CommentItem`으로, `confirm`·`alert`를 sonner로.
- framer-motion: 5단계에서 FeedCard 더미를 지우면 PostEditor 사이드바만 남는다. `<dialog>`로 바꾸고 의존성을 지운다.
- 다크 모드: `@custom-variant dark`를 넣어 `dark:`가 next-themes `.dark`를 따르게 하고 `ThemeToggle`은 `resolvedTheme`을 본다.
- 접근성: 아이콘 버튼 `aria-label`, 토글 `aria-pressed`, label·입력 연결.

## 8. 에디터 교체와 본문 보안 (CKEditor → 마크다운)

- 결정(2026-10-22): CKEditor를 걷어내고 직접 만든 마크다운 원문 편집 에디터(툴바 + 미리보기)로 바꾼다. 본문은 마크다운으로 저장한다. 이전 계획(CKEditor 플러그인·GHS 정리)은 폐기한다.
- 대상: 알려진 문제 보안 5~7.

**기능**

- 툴바: 본문·제목1~3, 굵게 `**`, 기울임 `*`, 취소선 `~~`, 밑줄 `++`(→ `<ins>`), 형광펜 `==`(→ `<mark>`), 글머리 `-`·번호 `1.` 목록, 인용 `>`, 구분선 `---`, 코드블록 ```` ``` ````·인라인 코드 `` ` ``, 수식 `$…$`·`$$…$$`, 링크 `[]()`, 이미지 `![](버킷:경로)`. 단축키는 ⌘/Ctrl + B·I·K.
- 툴바 동작: 선택 영역을 문법으로 감싸거나 풀고(토글), 줄 단위 문법(제목·목록·인용)은 선택한 줄 앞에 붙이거나 뗀다. 툴바로 넣은 문법도 ⌘Z로 되돌릴 수 있게 textarea 입력 기록을 살린다.
- 미리보기: 데스크톱은 좌우 분할, 모바일은 작성·미리보기 탭. 글 화면과 같은 렌더러를 브라우저에서 돌린다(편집 화면은 관리자 전용이라 번들 부담이 작다).
- 이미지: 툴바·붙여넣기·끌어놓기로 올린다. 올리는 동안 자리표시자를 넣었다가 키로 바꾼다. 글의 공개 범위 버킷으로 올리고(보안 5), 첨부·썸네일과 같은 업로드 함수 하나를 쓴다(7단계 `PostEditor` 항목에서 옮김).
- 빼는 것: 스크린샷의 `($)`(용도 확인 전 제외), 표·체크리스트 입력 버튼, 글자색·글꼴·정렬.

**렌더링**

- `markdown-it`(raw HTML 끔)에 형광펜(`markdown-it-mark`)·밑줄(`markdown-it-ins`)·수식(KaTeX) 플러그인을 붙인다. raw HTML을 끄므로 별도 정화기 없이 본문 XSS가 막힌다(보안 7). 링크는 `javascript:` 등을 막는 markdown-it 기본 검사를 쓴다.
- 이미지의 `버킷:경로` 키는 `coverSrcFromImageKey`로 주소를 바꾸고, 외부 URL은 그대로 둔다.
- 글 화면은 서버 컴포넌트 `MarkdownContent`가 HTML을 만든다. 클라이언트 컴포넌트인 `FeedCard`에는 서버에서 만든 본문을 children으로 넘긴다.
- 요약(`toExcerpt`)은 마크다운 토큰에서 글자만 뽑는다.
- 표·체크리스트는 기존 글에 쓴 것이 있으면 렌더러에서만 켠다(markdown-it 표는 기본, 체크리스트는 플러그인).
- 코드 문법 강조는 이번 범위에서 빼고, 필요하면 나중에 서버 쪽(shiki)으로 붙인다.

**기존 글 변환**

- 선행: 1단계 백업. 덤프에서 기존 HTML이 실제로 쓰는 서식(표·체크리스트·형광펜·이미지 캡션·글자색·인라인 style)을 먼저 센다.
- `scripts/`에 일회성 변환 스크립트를 둔다(turndown + 규칙: `<mark>`→`==`, `<u>`→`++`, `<s>`→`~~`, `<figure>` 이미지→`![캡션](키)`, 공개 버킷 URL→`버킷:경로` 키). 기본은 dry-run으로 글마다 변환 전후를 파일로 남기고, 검토한 뒤 `--apply`로 쓴다.
- 글자색·글꼴 크기·정렬·인라인 style은 사라진다. dry-run 보고서에 손실이 생기는 글을 표시한다.
- 아래 1~5를 로컬에서 끝내고 한 번에 배포한 직후 `--apply`를 실행한다. 그 사이 몇 분은 기존 글이 깨져 보일 수 있다.

**순서(커밋 단위)**

1. 렌더러: `lib/markdown.ts`의 `renderMarkdown`과 새 `toExcerpt`, 테스트.
2. 에디터: 편집 로직(감싸기 토글·줄 문법 토글) `lib/markdown-edit.ts`와 테스트, `MarkdownEditor`(툴바·미리보기·이미지 업로드), `PostEditor`의 CkEditor 교체, 업로드 함수 통합.
3. 글 화면: `HtmlContent` → `MarkdownContent`, KaTeX CSS, 본문 스타일(`.ck-content` → `prose` 기반, 형광펜·밑줄 다크 모드).
4. 변환 스크립트와 dry-run 검토(1단계 백업 뒤).
5. 정리: `ckeditor5`·`@ckeditor/ckeditor5-react` 의존성, `CkEditor.tsx`·`HtmlContent.tsx`, `globals.css`의 `--ck-*`·`.ck-content` 스타일 삭제. 이미지 응답 `Cache-Control: private`(보안 6), SVG 업로드 차단(보안 7). CLAUDE.md·README 갱신.
6. 배포 직후 변환 `--apply`.

> **결과** (2026-10-22): 1~6 완료. 커밋 `f97d9ce`·`c65883a`·`8968007`(렌더러·에디터·글 화면), `b317624`(이미지 보안), `cfa7d53`(CKEditor 제거), `35ffd11`(변환 스크립트).
> - 계획과 다르게: 변환을 push **직전**에 적용했다. 홈(`/`)·sitemap은 빌드 때 프리렌더되어 1일·1분 캐시되므로, 먼저 배포하면 깨진 본문이 캐시에 남는다. 그 사이 몇 분은 옛 배포에서 본문이 마크다운 글자로 보였다.
> - dry-run에서 찾아 규칙을 더했다: 겹치거나 붙은 굵게, 문장부호만 굵게, 인라인 코드 안 서식, 표 칸 안 문단, 주소 안 이스케이프, 본문 `$` 이스케이프. 변환 전후 글자는 135개 모두 같았고 인라인 style만 6개 글(아티클 4·다이어리 2)에서 사라졌다.
> - 렌더러에 `markdown-it-cjk-friendly`(한국어 조사 앞 굵게)와 `breaks: true`(엔터 한 번 = 줄바꿈)를 더했다.
> - 원본 HTML 백업은 로컬 `tmp/convert-html-to-markdown/backup-*.json`(gitignore)에 있다. 되돌리려면 `node scripts/convert-html-to-markdown.mjs --restore <파일>`.

**결정**

- 기존 글은 일괄 변환한다(권장). 렌더러가 마크다운 하나만 다루면 된다. 대안은 HTML 글을 남겨 두고 수정할 때 변환하는 것인데, 렌더러가 두 형식을 다뤄야 하고 `content_format` 열이 필요하다.

**하지 않는 것**: 글 공개 범위를 나중에 바꿀 때 이미 올린 이미지를 다른 버킷으로 옮기기, 코드 문법 강조, 표 입력 UI.

## 알려진 문제 (2026-10-21 코드 검토)

### 보안

1. (해결: 2단계) **요청 헤더 위조로 관리자 우회.** `getCurrentUser`·`isAdminDb`가 클라이언트가 보낼 수 있는 요청 헤더 `x-user-id`·`x-user-is-admin`을 믿는다. 비로그인 요청으로도 글·카테고리 쓰기·삭제, 비공개 이미지 조회·업로드가 된다(쓰기는 service role이라 RLS가 막지 못한다).
2. (해결: 2단계, DB 함수 `is_admin()`은 확인 필요) **`user_metadata.is_admin` 신뢰.** 사용자가 스스로 바꿀 수 있는 값이라, 회원가입 후 `updateUser`로 누구나 관리자가 된다(`isAdminDb`·미들웨어).
3. (해결: 2단계) 미들웨어가 사용자 id·email을 **응답** 헤더로 내보낸다. 의도한 성능 최적화는 동작하지 않는다.
4. (해결: 2단계) 열린 리다이렉트: 로그인 `from`, 콜백 `next`가 `//evil.example`이면 외부로 이동한다.
5. (해결: 8단계) 본문 편집기(CKEditor) 이미지는 글 공개 범위와 상관없이 공개 버킷에 올라간다. 비공개 글·다이어리 본문 이미지가 URL로 열린다.
6. (해결: 8단계) 비공개 버킷 이미지 응답에도 `Cache-Control: public, max-age=31536000, immutable`을 붙인다.
7. (해결: 8단계, 마크다운 렌더러가 raw HTML을 끈다) 본문 HTML을 정화 없이 렌더링한다(`HtmlContent`). SVG 업로드도 허용한다. 관리자 판정이 뚫리면 저장형 XSS가 된다.
8. `getCategories`가 `requireAdmin` 없이 service role을 쓴다(`isAdminDb`에만 기댄다).
9. (해결: 2단계) 로그아웃이 GET `/logout`이라 다른 사이트가 링크·이미지로 로그아웃시킬 수 있다. 브라우저에서 `signOut`한 뒤 GET을 또 불러 두 번 처리한다.
10. (해결: 4단계 일부) `server-only`가 `lib/server/publicPosts.ts`에만 있어 service role 클라이언트 모듈이 클라이언트 번들로 import되는 것을 빌드가 막지 못한다.
11. (해결: 2026-10-22 마이그레이션 `20261022010000_lock_users_admin_flag.sql`, 운영 DB 적용) **`users.is_admin` 자가 승격.** `users`의 INSERT·UPDATE 정책이 자기 행인지(`id = auth.uid()`)만 보고 열을 막지 않아, 로그인 사용자가 PostgREST로 자기 행의 `is_admin`을 `true`로 넣거나 바꿀 수 있었다. `is_admin()`(RLS: 글·카테고리 쓰기, 비공개 조회)과 앱의 관리자 판정이 모두 이 값을 본다. 자기 행 쓰기 정책을 지우고 anon·authenticated의 INSERT·UPDATE·DELETE를 회수했다. Supabase 기본 TRUNCATE 권한은 PostgREST로 실행할 수 없어 남겼다.

### 동작·데이터

- (관리자는 해결: 4단계, 비관리자는 5단계) 다이어리 상세는 없는 글·다른 타입 비공개 글에도 404 대신 "비공개 다이어리"를 200으로 보인다. 공개 다이어리도 RLS(`type <> 'diary'`) 때문에 비관리자에게 안 보일 수 있다(기본 스키마 확인 필요).
- (해결: 4단계) 수정 화면(`/article|feed|diary/edit/[slug]`)에서 없는 slug는 404 대신 500이다. 로그인 후에는 수정 화면이 아니라 목록으로 돌아간다.
- 카테고리 이름 변경·삭제가 트랜잭션이 아니다. 순서 변경(upsert)이 그 사이 삭제된 카테고리를 되살릴 수 있다. 비공개 카테고리 글을 공개 카테고리로 옮기면 바로 공개된다.
- `createPost`의 카테고리 자동 생성은 이름 검증(50자, `/` 금지)을 건너뛴다.
- (해결: 4단계) 글 수정으로 카테고리·slug가 바뀌면 옛 카테고리 목록 캐시를 무효화하지 않는다. `revalidatePath(`/${type}`)`는 아티클에서 없는 경로 `/blog`를 무효화한다.
- 발행 중에도 발행 버튼이 살아 있어 두 번 발행될 수 있다(`PostEditor`가 `createPost`를 transition 밖에서 기다린다).
- 댓글 DELETE 정책이 마이그레이션에 없고, `deleteComment`는 지운 행 수를 확인하지 않아 RLS가 막아도 성공을 돌려준다. 비공개 카테고리 글에는 관리자도 댓글을 못 쓸 수 있다.
- 공개 목록의 댓글 수는 anon 키로 세는데 댓글 조회 정책이 로그인 사용자 전용이라 항상 0일 수 있다. 댓글 액션은 캐시를 무효화하지 않는다.
- 아티클 "전체 글" 수가 카테고리별 합계라 카테고리 없는 공개 글이 빠진다(`getPublicPostCounts`).
- 피드 댓글 화면이 없다. 피드 카드의 좋아요 수·댓글은 하드코딩이다.
- 조회수(`view_count`)를 올리는 코드가 없다.
- (해결: 4단계) 날짜를 UTC로 표시해(`toISOString().slice(0, 10)`, 서버 `toLocaleDateString`) KST 오전에 쓴 글이 전날로 보인다. 표지 이미지 규칙도 화면마다 다르다(홈은 썸네일만, 아티클은 썸네일 → 첫 이미지, 피드는 첫 이미지).
- 다이어리 달력: 날짜 필터는 KST, 월 필터·라벨은 브라우저 시간대라 월 경계에서 어긋날 수 있다.
- 기본 스키마(테이블·`is_admin()`·기본 RLS·Storage 버킷)가 `supabase/migrations/`에 없다.

### 성능·SEO

- ISR이 사실상 꺼져 있다. 목록·상세가 `getViewer`(쿠키)를 읽어 매 요청 동적 렌더링된다.
- 공개 fetch의 revalidate 기본값이 60초라 세그먼트의 86400초와 어긋난다.
- 관리자 아티클 목록·피드·다이어리 목록은 본문까지 전부 읽는다(페이지네이션 없음).
- 상세 페이지에 `generateMetadata`가 없어 글 제목이 `<title>`·OG에 안 들어간다.
- sitemap은 공개 아티클 1000개에서 잘리고, 60초마다 다시 만들어질 수 있다. 본문(`content`)까지 읽는다.

### 기타

- 헤더·모바일 메뉴의 검색 입력이 동작하지 않는다. `BackButton`은 뒤로 가지 않고 항상 `fallbackHref`로 이동한다.
- `getComments`는 쓰는 곳이 없다(5단계 댓글 로딩 후보).
- 오류 응답에 `DB Error: <원문>`을 그대로 돌려준다.
- `globals.css`에 `@custom-variant dark`가 없어 `dark:` 유틸리티는 OS 설정을, 색 토큰은 next-themes의 `.dark`를 따른다. `ThemeToggle`은 `theme`을 봐서 시스템 테마일 때 첫 클릭에 바뀌지 않을 수 있다.
- (해결: 4단계) 목록·홈 `loading.tsx`가 하위 경로에도 적용돼 상세·쓰기·로그인 화면에 엉뚱한 스켈레톤(목록·홈)이 뜬다.
