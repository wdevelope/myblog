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
- [x] 5. ISR 복구와 일시정지 방지 — 공개 화면 전부 정적·ISR(`next start`에서 HIT, TTFB 2~5ms), 관리자는 draft mode, `/article` 경로 기반, 댓글 공개, 일시정지 방지 Cron(2026-10-22). 배포 뒤 확인과 `CRON_SECRET` 설정이 남았다(5절)
- [ ] 6. DB 타입과 쓰기 액션 정리
- [ ] 7. UI 통일과 큰 컴포넌트 분할
- [x] 8. 에디터 교체와 본문 보안 (CKEditor → 마크다운) — 마크다운 렌더러·원문 편집 에디터, 기존 글 135개 변환, 비공개 이미지 `private, no-store`·SVG 차단, CKEditor 제거(2026-10-22)
- [x] 9. 요청 왕복 줄이기 — `proxy.ts`를 `getClaims()`로(로그인 요청의 proxy 27~49ms → 1.5~3ms), 상세 댓글 조회의 글 재조회 제거. 아티클 목록 병렬화는 5단계로 넘김(2026-10-22, 9절)
- [ ] 10. 관리자 판정 단일화와 `public.users` 정리 — 1·2번 완료(RLS `is_admin()`·`getViewer` 모두 `app_metadata.is_admin`, 운영 DB 적용, 2026-10-22). 3번 `public.users` 삭제는 배포 확인과 1단계 백업 뒤(10절)
- [ ] 11. 관리자 화면을 직접 켜고 끄기 — 1~4 구현(2026-10-22). 관리자 로그인 상태의 브라우저 확인과 배포 뒤 측정이 남았다(11절)

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
- 결정(2026-10-22)
  1. 관리자 화면은 draft mode로 본다. 관리자가 로그인하면 `assertAdmin()` 확인 뒤 draft mode를 켜고, 로그아웃하면 끈다. draft 쿠키가 있는 요청만 동적으로 렌더링되고 그 안에서 `getViewer()`가 관리자를 다시 확인한다(쿠키는 Next가 서명해 위조할 수 없다). 방문자는 정적 HTML을 받는다. 원안의 `AuthProvider`·`useViewer()`·`<AdminOnly>`는 만들지 않는다.
  2. `/article`은 카테고리·페이지 번호를 경로로 옮겨 정적화한다(`/article/page/[n]`, `/article/category/[slug]`, `/article/category/[slug]/page/[n]`). 옛 `?category=`·`?page=` 주소는 새 경로로 리다이렉트한다.
  3. 다이어리 본문은 관리자 전용을 유지한다(CLAUDE.md 제품 규칙). 방문자에게 목록은 제목만(비공개는 "일기"), 상세는 안내 화면, 없는 slug는 404다. 목록과 존재 확인은 쿠키 없는 캐시 함수(service role, 본문 제외)로 한다.
  4. 댓글은 누구나 읽는다. 댓글 조회 RLS 정책을 anon까지 넓히는 마이그레이션을 추가하고 댓글을 정적 HTML에 넣는다. 쓰기·삭제 버튼만 클라이언트에서 로그인 상태를 보고 띄운다. 댓글 액션은 `revalidatePublicPosts`로 상세를 무효화한다. 목록의 댓글 수가 0으로 보이던 문제도 함께 풀린다.

  | 경로 | 지금 동적인 이유 | 할 일 |
  |---|---|---|
  | `/` | 없음 | 빌드 출력으로 정적인지 확인 |
  | `/feed` | `getViewer`(쿠키)·쿠키 조회 | `getPublicPosts`로 교체. 관리자 메뉴·쓰기 버튼은 draft mode에서만, 더미 좋아요·댓글 제거 |
  | `/article/[slug]` | 같음 + 단건·댓글 쿠키 조회 | 공개 단건·댓글 조회와 `generateStaticParams`·`generateMetadata`. 댓글 쓰기·삭제만 클라이언트 |
  | `/diary` | 같음 + 쿠키 조회 | 비관리자 목록을 쿠키 없는 캐시 함수로, `DiaryIndexClient`를 `<Suspense>`로 감쌈(`useSearchParams`) |
  | `/diary/[slug]` | 같음 | 결정 3 |
  | `/article` | 같음 + `searchParams`·카테고리 쿠키 조회 | 결정 2 |

- 공개 fetch의 revalidate 기본값 60초를 세그먼트와 같은 86400초로 맞춘다(태그 무효화가 있다).
- 확인: `next build` 출력에서 위 경로가 정적·ISR로 나오는지, 배포 뒤 `x-vercel-cache: HIT`인지, 3단계 TTFB와 비교한다.
- 결과(2026-10-22)
  - 빌드: `/`·`/article`·`/feed`·`/diary` ○, `/article/[slug]`·`/article/category/[slug]`·`/article/page/[page]`·`/diary/[slug]` ●(하루 재생성). `next start`에서 모두 `x-nextjs-cache: HIT`, TTFB 2~5ms.
  - 공개 조회: `getPublicPost`·`getPublicCategories`·`getPublicComments`·`getPublicDiaryIndex`(service role로 본문 없이 읽어 `unstable_cache`), 재생성 주기 86400초. 관리자 화면: `/api/admin-mode`, `getPreviewViewer`, `lib/adminMode`(탭 세션마다 다시 켬).
  - 댓글: 조회 정책을 anon까지 넓힌 마이그레이션(`20261022020000_comments_public_read.sql`, 운영 DB 적용), 댓글 쓰기·삭제가 상세·목록을 무효화. `getComments` 액션과 `getPostsDirectly`의 방문자 다이어리 분기는 지웠다.
  - `/article`: `ArticleIndex` 하나를 네 경로가 쓰고, 옛 `?category=`·`?page=` 주소는 `proxy.ts`가 308로 보낸다(`next.config` redirects는 한글 쿼리에서 500). 범위 밖 쪽 번호의 PostgREST 416은 빈 목록으로 처리한다.
- 남은 일: Vercel 환경변수 `CRON_SECRET` 설정(사용자). 배포 뒤 `x-vercel-cache: HIT`·TTFB 측정(3단계와 함께). 관리자 로그인 → 비공개 글·관리 버튼이 보이는지, 로그아웃 → 방문자 화면인지 브라우저 확인(관리자 비밀번호가 필요해 사용자가 한다).
- 알려진 한계: `(list)`의 `loading.tsx` 스트리밍 때문에 목록 경로 안의 `notFound()`는 200 + `noindex` 404 화면(soft 404), `permanentRedirect()`는 meta refresh가 된다. 다이어리 목록은 `useSearchParams` 때문에 정적 HTML에 스켈레톤만 있고 브라우저에서 그린다.
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

## 9. 요청 왕복 줄이기

- 근거(2026-10-22, 로컬 `next dev` 측정): Supabase(서울) 왕복은 새 연결 기준 약 55~65ms다. 렌더가 끝난 페이지는 익명 기준 `/` 25ms, `/article` 약 120ms이고, 세션 쿠키가 있으면 `proxy.ts`에서 30~45ms가 더 든다. 화면이 느려지는 이유는 거리보다 직렬 왕복의 수다.
  - 로그인 요청은 화면 전환·서버 액션·`/api/images`까지 매번 Auth 서버에 두 번 간다(`proxy.ts`의 `getUser()`, `getViewer`의 `getUser()`).
  - 로그인 상태의 아티클 상세는 인증 2회 → 글 → 같은 글 다시 → 댓글로 5번을 차례로 기다린다.
  - 익명 `/article`은 개수 → 목록 → 카테고리 3번을 차례로 기다린다.
- 5단계와의 관계: 5단계가 `/article`(결정 1)과 상세의 댓글(클라이언트 말단)을 다시 짜므로, 여기서는 구조를 건드리지 않는 작은 변경만 한다. 1번은 5단계 뒤에도 그대로 남고, 2·3번은 5단계에서 바뀌거나 사라질 수 있다.

**변경(커밋 단위)**

1. `proxy.ts`: `auth.getUser()`를 `auth.getClaims()`로 바꾼다. ES256 서명 키면 JWKS(모듈 전역 캐시 10분)로 서명을 로컬에서 검증하므로, 토큰이 살아 있는 동안은 Auth 서버에 가지 않는다. 만료된 토큰은 지금처럼 `getSession()` 안에서 갱신되고 쿠키가 응답과 이번 요청에 실린다. 관리자 판정은 그대로 `getViewer`의 `getUser()`가 하므로 2단계 보안 방향은 바뀌지 않는다.
   - 선행 확인: 지금 발급되는 액세스 토큰의 서명 키가 ES256인지 본다(대시보드 JWT Keys의 현재 키, 또는 토큰 헤더의 `alg`·`kid`). 공개 JWKS에 ES256 키가 있는 것은 확인했다(2026-10-22). HS256이면 `getClaims()`가 `getUser()`로 되돌아가 이득이 없으니 이 항목을 접는다.
   - 테스트: `proxy.test.ts`의 `getUser` mock을 `getClaims`로 바꾸고, 갱신 쿠키 전달·`sb-` 쿠키 없을 때 생략 테스트는 그대로 통과시킨다.
2. `app/article/(list)/page.tsx`: `getViewer()` 뒤의 독립 조회를 `Promise.all`로 묶는다. 비관리자는 `getPublicPostCounts`·`getPublicPosts`·카테고리 조회, 관리자는 `getPostsDirectly`·카테고리 조회다. 화면 결과는 바뀌지 않는다(화면 마크업이라 테스트 대신 브라우저로 확인).
3. `lib/server/posts.ts`: `getCommentsDirectly({ postId })`가 글을 다시 읽어 타입·공개 범위를 확인하는 조회를 없앤다. 호출부(`app/article/[slug]/page.tsx` 하나)가 `getPostForRoute`로 이미 읽은 글(`id`·`type`·`visibility`)을 넘기고, 다이어리·비공개 판정은 그 값으로 한다. 테스트를 먼저 쓴다(다이어리 → 빈 배열, 비공개 글 + 비관리자 → 빈 배열, 그 밖에는 댓글 조회 1회만).

**확인**

- `npm run lint && npm run typecheck && npm test`.
- 로컬에서 관리자로 로그인한 상태로(로그인은 사용자가 한다) dev 로그의 `proxy.ts`·`render` 시간을 근거의 숫자와 비교한다. 목표: 토큰이 살아 있을 때 `proxy.ts` 수 ms, 익명 `/article` 렌더가 왕복 1~2회만큼 줄어드는 것, 로그인 상세 왕복 5회 → 3회.

**하지 않는 것**: `getViewer`의 `getUser()`를 `getClaims()`로 바꾸기(세션 철회가 토큰 만료 전까지 반영되지 않는다. 바꾸려면 따로 결정한다), 5단계 범위인 정적화·캐시.

> **결과** (2026-10-22): 1·3번 완료, 2번은 5단계로 넘김.
> - 1번: 실제 발급된 액세스 토큰 헤더가 `ES256`이고 `kid`가 공개 JWKS의 키와 같았다. 로그인 상태에서 dev 로그의 `proxy.ts`가 27~49ms에서 1.5~3ms로 줄었다(바꾼 직후 첫 요청만 JWKS 조회로 124ms, 이후 10분 캐시). 관리자 계정이 아니라 일반 계정으로 쟀는데, proxy는 계정과 상관없이 같은 경로를 탄다. 판정은 그대로 `getViewer`가 해서 일반 계정의 `/article/write`는 `/`로 돌아갔다.
> - 3번: `96b6582`. 호출부 변경은 같은 폴더의 다른 세션 커밋(`33e18dd`, 사이트 이름 변경)에 먼저 섞여 들어가 그 사이 HEAD가 typecheck에 실패했고, 이 커밋으로 맞췄다.
> - 2번: 구현해서 익명 `/article`이 약 120ms → 70~85ms인 것까지 확인했지만 되돌렸다. 5단계 결정 2가 `/article`을 경로별 정적 페이지로 다시 짜는 같은 파일이라, 병렬화는 그때 새 경로에 적용한다.

## 10. 관리자 판정 단일화와 `public.users` 정리

- 근거(2026-10-22, Supabase MCP 읽기 전용 조회, Supabase 문서 "User Management"·"Row Level Security")
  - 관리자 여부가 두 곳에 있다. 앱의 `getViewer`는 `app_metadata.is_admin`을 먼저 보고 없으면 `public.users.is_admin`을 보는데, RLS의 `is_admin()`은 `public.users`만 본다. 두 값이 어긋나면 앱과 DB의 판정이 갈린다.
  - `public.users`는 이름과 달리 관리자 목록이다. 2025-12-28 코드(`51d7a3b`의 `ensureAdminSynced`)가 `ADMIN_EMAILS`에 든 사용자만 upsert했고 가입 트리거는 없다. 지금 `auth.users`는 2개(관리자 1·일반 1), `public.users`는 1개(관리자)라 전체 회원 목록으로 오해하기 쉽다.
  - `is_admin()`은 노출 스키마(`public`)의 `SECURITY DEFINER` 함수다. 문서는 노출 스키마에 두지 말라고 한다. 호출자 자신의 관리자 여부만 돌려주므로 지금 위험은 작다.
  - `is_admin()`을 쓰는 RLS 정책은 10개다: `posts` 4(select·insert·update·delete), `categories` 2, `comments` 3(select·insert·delete), `users` 1. Storage 정책과 브라우저 코드는 `public.users`·`is_admin()`을 쓰지 않는다.
- 방향: 관리자 판정의 근거를 `app_metadata.is_admin` 하나로 한다. service role만 바꿀 수 있고 JWT에 실려 RLS가 테이블을 조회하지 않고 읽는다. `public.users`는 지운다(결정 1).
- 알아 둘 점: RLS는 JWT의 값을 보므로 관리자 권한을 주거나 빼면 토큰이 갱신될 때(최대 1시간, 다시 로그인하면 바로) 반영된다. 앱 판정은 `getUser()`로 매번 Auth 서버 값을 봐서 바로 반영된다. 관리자가 1명이라 받아들인다.

**변경(커밋 단위)**

1. DB 판정: 새 마이그레이션으로 `public.is_admin()`을 `create or replace`한다. 본문은 `coalesce(auth.jwt() -> 'app_metadata' ->> 'is_admin', '') = 'true'`이고, `SECURITY DEFINER`를 떼고 `stable`·`set search_path = ''`로 둔다. 이름·위치·인자가 같아 정책 10개는 다시 만들지 않고, 기존 함수라 권한(grant)도 그대로다(1절 GRANT 변경과 무관).
   - 적용 전 확인: `public.users.is_admin = true`인 계정이 모두 `app_metadata.is_admin = true`인지 본다(2026-10-22 기준 1개, 일치).
   - 적용 뒤 확인: 롤백하는 트랜잭션에서 `set local role authenticated`와 `request.jwt.claims`(관리자·일반 계정)를, 그리고 `anon`을 바꿔 가며 `is_admin()`과 비공개 글·카테고리 수를 본다. 브라우저에서는 관리자 draft mode로 비공개 글이 보이는지 본다.
   - 마이그레이션은 운영 DB에 바로 적용되므로 사용자 확인을 받고 적용한다. 관리자 계정은 두 값이 모두 `true`라 1·2번은 어느 쪽을 먼저 배포해도 판정이 같다.
2. 앱 판정: `getViewer`에서 `public.users` 조회를 지우고 `app_metadata.is_admin`만 본다. 테스트를 먼저 바꾼다(`public.users.is_admin`만 `true`인 사용자는 관리자가 아니다). 다른 테스트의 `users` 테이블 mock(`posts`·`categories`·`comments` 액션, 이미지 라우트)을 정리하고, CLAUDE.md 인증 줄과 관리자 지정 방법(대시보드 SQL로 `raw_app_meta_data`에 `is_admin: true`)을 고친다.
3. 테이블 정리: 1·2를 배포하고 확인한 뒤 새 마이그레이션으로 `public.users`를 지운다. 정책 2개와 `trg_users_set_updated_at`가 함께 지워진다. 1번에서 함수가 테이블을 더는 읽지 않아야 지울 수 있다.
   - 선행: 1단계 백업. 관리자 1행(id·email·is_admin·시각)뿐이고 같은 정보가 `auth.users`·`app_metadata`에 있어 잃을 것은 적지만, 덤프에 남긴 뒤 지운다.

**착수 전에 정할 것**

1. `public.users`: (a) 지운다(권장). 닉네임 기능이 없고 댓글 작성자는 `사용자 <id 앞 6자>`로 보인다. 나중에 닉네임이 필요하면 `profiles` 테이블과 가입 트리거(`handle_new_user`)·기존 계정 채우기로 새로 만든다. (b) 지금 `profiles`로 바꾸고 트리거와 기존 계정 채우기를 붙인다. 어느 쪽이든 관리자 여부는 넣지 않는다.

**확인**

- `npm run lint && npm run typecheck && npm test`, 1번의 SQL 확인.
- 관리자·일반 계정·비로그인으로 비공개 글 목록·상세, 쓰기 화면, 비공개 이미지(`/api/images`)를 본다(로그인은 사용자가 한다).

**하지 않는 것**: `user_roles` 테이블과 Custom Access Token Hook(Supabase 공식 RBAC, 관리자 1명에 과하다). 정책을 `(select is_admin())`로 감싸 다시 만들거나 함수를 비노출 스키마로 옮기기(바꾼 함수는 `SECURITY DEFINER`가 아니고 JWT만 읽어 문서의 주의에 해당하지 않으며, 글 135개 규모라 성능 차이가 없다). 회원가입 닫기(댓글에 필요).

> **결과** (2026-10-22): 결정 1은 (a) 삭제. 1·2번 완료, 3번 남음.
> - 1번 `f1aef34`: `20261022030000_is_admin_from_jwt.sql`을 운영 DB에 적용했다(이력 이름 `is_admin_from_jwt`). 본문은 계획의 `->> … = 'true'` 대신 `(… -> 'is_admin') = 'true'::jsonb`로 JSON `true`만 관리자로 보게 했다(문자열 `"true"`는 아님, 앱과 같은 기준). 적용 전 관리자 계정의 두 값이 모두 boolean `true`임을 확인했고, 적용 뒤 `SECURITY DEFINER` 해제·정책 10개·anon/authenticated 실행 권한을 확인했다. 판정은 관리자 `true`(비공개 글 전부·비공개 카테고리 3), 일반 계정(`user_metadata.is_admin` 위조 포함)·anon `false`(비공개 0)로 적용 전과 같았다. 비공개 글 수가 104 → 119인 것은 그 사이 다이어리가 80 → 95개로 늘어서다.
> - 2번 `4c7f705`: `getViewer`가 `app_metadata.is_admin === true`만 본다. 실패하는 테스트 2개(테이블만 관리자, 문자열 `"true"`)를 먼저 쓰고 고쳤다. 다른 테스트 5곳의 `users` mock을 지우고 CLAUDE.md를 고쳤다. HEAD에 이 변경만 얹어 typecheck·lint·테스트를 통과시켰다.
> - 남은 일(3번): 2번을 배포하고 관리자 화면에서 비공개 글이 보이는지 확인한 뒤, 1단계 백업에 `public.users`가 들어간 것을 보고 삭제 마이그레이션을 쓴다. 브라우저 확인은 아직 못 했다.

## 11. 관리자 화면을 직접 켜고 끄기

- 근거(2026-10-22, 로컬 `next start` 측정·사용자 확인)
  - 관리자가 로그인하면 관리자 화면(draft mode)이 저절로 켜진다. `LoginForm`은 로그인 직후에, `AuthButton`은 탭 세션마다(`sessionStorage`의 `myblog:admin-mode-checked`) `enableAdminMode()`를 부른다. draft 쿠키가 있으면 홈을 포함한 모든 공개 페이지가 CDN 캐시를 건너뛰고 요청마다 함수에서 렌더링된다. 그래서 콜드 스타트, `getViewer`의 `auth.getUser()` 왕복, DB 조회가 매번 붙는다.
  - 관리자 화면 이동은 서버 응답 65~177ms, 화면 완료 약 310ms다. 방문자는 7~18ms, 38~120ms다. 운영(Vercel icn1, Supabase 서울)에서도 로그아웃 상태가 빠르다(사용자 확인).
  - 관리자 화면에서만 달라지는 곳은 `getPreviewViewer()`를 부르는 5곳이다.
    - 아티클 목록(`ArticleIndex`): 비공개 글·카테고리, 쓰기 버튼, 카테고리 설정
    - 아티클 상세: 비공개 글, 더보기 메뉴, 남의 댓글 삭제
    - 피드: 쓰기 버튼, 카드 메뉴
    - 다이어리 목록·상세: 본문, 더보기 메뉴
  - 쓰기·수정 화면은 `requireAdmin`(쿠키 세션)으로 판정하므로 draft mode와 상관없이 열린다.
- 결정(2026-10-22, 사용자): 관리자 화면은 기본으로 꺼 두고, 관리자가 직접 켜고 끈다.
- 방향: 상태의 원본은 draft 쿠키 하나다. `/api/admin-mode`(POST는 `assertAdmin` 확인 뒤 켜기, DELETE는 끄기)와 `getPreviewViewer`·`requireAdmin`은 그대로 둔다. 바뀌는 것은 "언제 켜나"와 "켜진 상태를 어떻게 보여 주나"다.
  - 켜기: 헤더의 "관리자 화면" 토글을 누르면 `POST /api/admin-mode`를 보낸다. 204면 `router.refresh()`로 지금 화면과 헤더를 관리자 화면으로 다시 받는다. 401(세션 만료 등)이면 토스트로 알리고 화면은 새로 받지 않는다.
  - 끄기: 같은 토글을 누르면 `DELETE`를 보내고 `router.refresh()`한다. 로그아웃할 때도 지금처럼 끈다.
  - 로그인: 아무것도 켜지 않는다. 브라우저를 다시 열어도 저절로 켜지 않는다(자동 켜기 코드와 `sessionStorage` 표시를 지운다).
  - 표시: 헤더가 서버 값을 그린다. draft 쿠키는 httpOnly라 브라우저가 읽지 못한다. 탭마다 따로인 `sessionStorage`는 브라우저 전체에 걸리는 쿠키와 어긋난다(새 탭, preview 키가 바뀐 배포 뒤). 그래서 `SiteHeader`가 `(await draftMode()).isEnabled`를 읽어 토글에 넘긴다.
    - 정적 생성 때 이 값은 `false`이고, 값을 읽는 것은 동적 API로 잡히지 않는다. 지금 공개 페이지들도 같은 방식으로 정적이다. 그래서 방문자 HTML은 바뀌지 않는다.
    - 루트 레이아웃은 클라이언트 이동 때 다시 그려지지 않는다. 그래서 상태를 바꾸는 곳(토글, 저장, 로그아웃)은 모두 `router.refresh()`로 끝낸다.
  - 수명: draft 쿠키는 만료가 없는 세션 쿠키다. 모든 탭에 같이 걸리고 브라우저를 닫으면 사라진다. 쿠키 값이 빌드의 preview 키라서 키가 바뀐 배포 뒤에도 꺼진다(빌드 캐시가 없거나 14일이 지나 키를 바꿀 때). 토글은 서버 값을 그리므로 어느 경우든 표시와 실제가 같다.
  - 남은 쿠키 정리: 세션이 만료되거나 다른 탭에서 로그아웃하면 draft 쿠키만 남을 수 있다. 이때 토글은 "서버는 켜짐인데 브라우저에 관리자 세션이 없음"을 보고 조용히 끈다. 그냥 두면 방문자 화면을 계속 동적으로 렌더링한다.
  - 쓰기·수정 화면: 꺼져 있어도 열린다. 다만 들어가는 버튼(쓰기 버튼, 더보기 메뉴)은 관리자 화면에만 있다. 그래서 토글을 켜거나 주소를 직접 친다. 저장에 성공하면 관리자 화면을 켜고 상세로 간다(결정 5).
- 알아 둘 점
  - 꺼진 상태의 관리자는 방문자와 같은 정적 화면을 본다. 다이어리 본문도 보이지 않고 "비공개 다이어리" 안내가 나온다(결정 6).
  - 꺼져 있어도 로그인 상태라 `sb-` 쿠키가 있는 요청에는 `proxy.ts`가 돈다. Vercel은 proxy를 CDN보다 먼저 실행한다(방문자 경로 작업에서 matcher를 세션 쿠키가 있는 요청과 옛 주소로 좁혔다, 2026-10-22). 그래서 꺼진 관리자의 이동은 CDN 캐시를 쓰지만, 방문자보다 proxy 시간만큼 느릴 수 있다.

**변경(커밋 단위)**

1. 동작 불변 정리: 브라우저 세션 구독(`getSession()` + `onAuthStateChange`)이 `AuthButton`·`MobileNav`·`CommentsThread`에 같은 코드로 있고, 토글이 네 번째가 된다. 그래서 `app/_components/useSessionUser.ts`(`{ user, loading }`)로 모은다.
   - 테스트: `CommentsThread.test.tsx`가 그대로 통과하는지 본다(같은 `createSupabaseBrowserClient` mock을 쓴다).
2. 관리자 화면 토글. 자동 켜기 제거와 한 커밋으로 한다. 나누면 그 사이 관리자 화면을 켤 방법이 없다.
   - `lib/adminMode.ts`: `isAdminModeChecked`와 `sessionStorage` 표시를 지운다. `enableAdminMode`·`disableAdminMode`가 성공 여부(`boolean`)를 돌려주게 하고, 머리 주석을 고친다.
     - `lib/adminMode.test.ts`: "이번 탭에서는 다시 묻지 않는다"와 "다음 로그인 때 다시 묻는다"를 지운다.
     - 남길 테스트: 켜기 204면 true, 401이면 false, 끄기 204면 true, 네트워크 실패면 둘 다 false이고 throw하지 않는다.
     - `window`를 더 쓰지 않으면 jsdom 줄도 뺀다.
   - 새 `app/_components/AdminModeToggle.tsx`(`enabled` prop)
     - 브라우저 세션의 `app_metadata.is_admin`이 true일 때만 그린다. 이 값은 표시용이고 판정은 서버의 `assertAdmin`이 한다.
     - 버튼 이름은 "관리자 화면"으로 고정하고 `aria-pressed`를 붙인다. 켜지면 강조색으로 바꾼다.
     - 누르면 요청 뒤 `startTransition(() => router.refresh())`를 부르고, 그동안 버튼을 막는다. 실패는 sonner 토스트로 알린다.
     - `enabled`인데 관리자 세션이 없으면 조용히 끄고 화면을 새로 받는다.
   - 새 `app/_components/AdminModeToggle.test.tsx`(jsdom, `@/lib/supabase/client`·`next/navigation`·`@/lib/adminMode`·`sonner` mock)
     - 세션이 없거나 일반 사용자면 그리지 않는다.
     - 꺼져 있을 때 누르면 켜기를 요청한 뒤 화면을 새로 받는다.
     - 켜져 있으면 `aria-pressed=true`이고, 누르면 끄기를 요청한 뒤 화면을 새로 받는다.
     - 켜기가 거절되면 알리고 화면을 새로 받지 않는다.
     - 서버가 켜짐으로 그렸는데 관리자 세션이 없으면 조용히 끈다.
   - `SiteHeader.tsx`: async로 바꿔 `draftMode().isEnabled`를 읽는다. 데스크톱은 로그인 버튼 옆(`hidden sm:flex` 영역)에 토글을 두고, `MobileNav`에는 `adminMode` prop으로 넘긴다.
   - `MobileNav.tsx`: 메뉴 아래쪽, 로그아웃 위에 토글을 둔다. 켜져 있으면 메뉴 열기 버튼에 점을 찍는다(스크린 리더용 "관리자 화면 켜짐").
   - `AuthButton.tsx`: 탭 세션마다 켜던 분기와 `isAdminModeChecked` import를 지운다. `app/login/LoginForm.tsx`: 로그인 직후의 `enableAdminMode()`를 지운다.
   - CLAUDE.md 구조 절의 "관리자 화면" 줄을 새 흐름으로 고친다.
   - 바꾸지 않는 파일: `app/api/admin-mode/route.ts`·`route.test.ts`, `lib/server/admin.ts`·`admin.test.ts`.
3. 저장 뒤 관리자 화면 켜기(결정 5): `PostEditor`의 `submit` 성공 분기에서 `await enableAdminMode()`를 먼저 부른다. 그 뒤는 지금처럼 `router.push(상세)`와 `router.refresh()`다. refresh가 헤더까지 다시 그려 토글도 켜짐으로 바뀐다.
   - 켜기에 실패해도 무시하고 이동한다.
   - 로직은 테스트가 있는 `lib/adminMode` 호출 하나라서 브라우저로 확인한다.
4. 관리자 화면 이동 표시(결정 7)
   - 새 `lib/linkNavigation.ts`의 순수 함수 `isNavigationClick(event, anchor, current)`. 아래 조건을 모두 만족할 때만 true다.
     - 왼쪽 클릭이고 수정키가 없다.
     - `target`이 없거나 `_self`이고, `download`가 없다.
     - 같은 출처이고, 경로나 쿼리가 지금과 다르다.
   - `lib/linkNavigation.test.ts`
     - 다른 경로를 왼쪽 클릭하면 true다.
     - ⌘·Ctrl·Shift·Alt 클릭과 가운데 클릭은 false다.
     - `_blank`·`download`는 false다.
     - 다른 출처는 false다.
     - 해시만 다르면 false, 쿼리만 다르면 true다.
   - 새 `app/_components/AdminNavProgress.tsx`
     - `document`의 click(캡처 단계)에서 위 함수가 true면 150ms 뒤 화면 맨 위에 얇은 진행 막대를 띄운다. 150ms를 기다리는 것은 캐시된 이동에서 막대가 깜빡이지 않게 하려는 것이다.
     - `usePathname()`·`useSearchParams()`가 바뀌면 숨긴다. 10초 안전 타이머도 둔다.
     - `prefers-reduced-motion`이면 움직임 없이 보인다. 애니메이션은 `globals.css`에 둔다.
   - `SiteHeader`는 `isEnabled`일 때만 이 막대를 그린다. 방문자 화면(정적 HTML)에는 나오지 않는다.
5. 문서: 로드맵 진행 현황과 이 절의 결과를 적는다.

**착수 전에 정할 것** — 결정(2026-10-22, 사용자): 1~7 모두 (a)

1. 토글 위치
   - (a) 데스크톱은 헤더의 로그아웃 버튼 옆, 모바일은 메뉴 아래쪽(로그아웃 위). 켜지면 메뉴 버튼에 점을 찍는다(권장). 로그인 버튼 옆이라 찾기 쉽고, 켜진 상태가 늘 보여 "비공개 글이 왜 안 보이지" 하는 혼란을 막는다.
   - (b) 관리자에게만 보이는 화면 구석 고정 배지. 어디서나 보이지만 본문과 모바일 하단을 가린다.
   - (c) 로그인 버튼 자리를 "관리자 화면·로그아웃" 드롭다운으로 바꾼다. 7단계 내비 정리와 겹친다.
2. 토글을 보일 사람
   - (a) 브라우저 세션의 `app_metadata.is_admin`이 true인 사용자(권장). 요청이 따로 들지 않고, 10단계가 판정 근거로 정한 값과 같다. 지금 관리자 계정은 두 값이 모두 true다. 표시용이라 누가 값을 바꿔도 서버가 401로 거절한다.
   - (b) 로그인한 사용자 모두에게 보이고 401이면 토스트. 댓글을 쓰는 일반 사용자에게는 쓸모없는 버튼이다.
   - (c) 서버에 물어본다(`GET /api/admin-mode`). 탭마다 Auth 왕복이 1번 늘고 버튼이 늦게 뜬다.
3. 켜진 상태의 수명
   - (a) 브라우저 세션(draft 쿠키 기본값, 권장). 추가 코드가 없다. 한 번 켜면 모든 탭에 걸리고 브라우저를 닫으면 꺼진다.
   - (b) 탭마다. 쿠키는 탭을 구분하지 못한다. `sessionStorage`로 흉내 내면 지금처럼 표시와 실제가 어긋난다.
   - (c) 시간 제한(예: 2시간). `draftMode()`에는 만료 옵션이 없어 Next 내부 쿠키(`__prerender_bypass`)를 직접 고쳐 써야 한다.
4. 로그인 직후 상태
   - (a) 꺼짐(권장, 사용자 결정 그대로).
   - (b) 마지막 상태를 기억했다가 되살린다(`localStorage`). 지금의 자동 켜기를 다시 만드는 셈이다.
5. 쓰기·수정 화면
   - (a) 저장에 성공하면 켜고 상세로 간다(권장). 꺼진 채 비공개 아티클을 저장하면 상세가 404이고, 다이어리는 "비공개 다이어리" 안내로 떨어진다. 켜 두면 방금 쓴 글을 동적 화면으로 바로 본다. 화면을 열기만 해서는 켜지 않는다.
   - (b) 쓰기·수정 화면을 열면 켠다. 열었다가 취소해도 켜진 채 남는다. 헤더 표시를 맞추려면 `router.refresh()`로 편집 화면을 한 번 더 렌더링해야 한다.
   - (c) 켜지 않는다. 위의 404를 받아들인다.
6. 꺼진 상태의 다이어리
   - (a) 지금처럼 안내 화면을 보이고, 관리자는 헤더 토글로 켠다(권장). 안내 화면이 방문자와 같은 정적 페이지로 남는다.
   - (b) 안내 화면에 관리자에게만 "관리자 화면 켜기" 버튼을 띄운다. 정적 페이지에 세션을 읽는 클라이언트 말단이 하나 늘고, 방문자도 그 코드를 받는다.
7. 상세 이동 피드백
   - (a) 관리자 화면에서만 상단 진행 막대를 띄운다(변경 4, 권장). 켠 상태에서 상세로 이동하면 서버 응답을 기다리는 동안 화면에 아무 변화가 없다(`app/article/[slug]`·`app/diary/[slug]`에 `loading.tsx`가 없다). 콜드 스타트면 더 길어진다.
   - (b) 하지 않는다. 1~3을 배포한 뒤 켠 상태의 이동이 실제로 답답한지 보고 정한다.
   - 고르지 않는 방법
     - 상세 `loading.tsx`: 방문자 이동에도 스켈레톤이 뜬다. 또 5절 알려진 한계처럼 없는 slug의 `notFound()`가 200 soft 404가 된다.
     - `useLinkStatus`: 링크마다 넣어야 하고, 그 링크들이 방문자와 같은 목록 컴포넌트에 있다.

**확인**

- `npm run lint && npm run typecheck && npm test`.
- `npm run build`(DB 접속 필요): `SiteHeader`가 `draftMode()`를 읽은 뒤에도 정적 여부가 5절 결과 그대로인지 본다. `/`·`/article`·`/feed`·`/diary`는 ○, 상세와 카테고리·쪽 번호 경로는 ●여야 한다.
- `next start`에서 관리자로 로그인한 상태로 잰다(로그인은 사용자가 한다).
  - 꺼 둔 상태: 상세·목록 이동이 `x-nextjs-cache: HIT`이고, 서버 응답이 방문자 수준(7~18ms)에 가까운지 본다.
  - 켠 상태: 지금 숫자(65~177ms)와 같은지 본다.
- 브라우저(데스크톱, 모바일 폭, 다크 모드)
  - 로그인 직후 꺼져 있고 토글이 보인다.
  - 켜면 전체 새로고침 없이 비공개 글과 관리 버튼이 나온다. 새 탭도 켜져 있다.
  - 끄면 방문자 화면이 된다. 브라우저를 다시 열면 꺼져 있다.
  - 로그아웃하면 토글이 사라지고 꺼진다. 일반 계정에는 토글이 없다.
  - 꺼진 채 비공개 아티클·다이어리를 저장하면 상세가 보이고 토글이 켜짐으로 바뀐다.
  - (변경 4) 켠 상태에서 상세를 누르면 막대가 뜨고, 끈 상태와 방문자에게는 뜨지 않는다.
- 배포 뒤: 꺼진 관리자의 이동이 `x-vercel-cache: HIT`인지 본다(3·5단계 측정과 함께).

**하지 않는 것**

- 상세 `loading.tsx`(결정 7).
- `proxy.ts`·`app/diary/DiaryIndexClient.tsx` 수정. 방문자 경로 작업에서 따로 고쳤다.
- 켠 상태의 렌더 자체를 빠르게 하기. 상세의 인증 → 글 → 댓글 직렬 왕복과 `getViewer`의 `getClaims()` 전환은 9절처럼 따로 결정한다.
- 다른 탭의 토글 표시 맞추기. 토글을 누른 탭만 바로 바뀐다. 다른 탭은 이동하는 화면부터 쿠키를 따르고(캐시된 화면은 늦을 수 있다), 헤더 표시는 새로고침할 때 맞춰진다.
- 로그아웃 코드 중복(`AuthButton`·`LogoutButton`) 정리. 7단계에서 한다.

> **결과** (2026-10-22): 1~4 구현, 배포 전.
> - 커밋: 1 `3770361`(`useSessionUser`), 2 `3feae40`(토글·자동 켜기 제거), 3 `8f85fcd`(저장 뒤 켜기), 4 `109c2ae`(진행 막대). 테스트 173 → 187개.
> - `npm run build`: `SiteHeader`가 `draftMode()`를 읽은 뒤에도 `/`·`/article`·`/feed`·`/diary`는 ○, 상세·카테고리는 ●로 그대로다.
> - 브라우저(방문자, 데스크톱·모바일 폭): 토글과 진행 막대가 없고 헤더·모바일 메뉴가 전과 같다. 토글·진행 막대의 동작은 컴포넌트 테스트(jsdom)로만 확인했다.
> - 남은 확인: 관리자 로그인 상태(로그인은 사용자가 한다)의 켜기·끄기·저장 뒤 켜기·진행 막대, 배포 뒤 꺼진 관리자 이동의 `x-vercel-cache: HIT`.
> - 함께 한 방문자 경로 수정(별도 커밋 `a120e49`·`4fd317b`): `proxy.ts` matcher를 세션 쿠키·옛 주소로 좁혀 운영의 방문자 응답(TTFB, 연결 재사용)이 약 100ms → 14~30ms가 됐다. 세션 쿠키가 있는 요청은 여전히 약 130ms(콜드 320ms)다.

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
12. (판정은 해결: 10단계 1·2번, 테이블 삭제는 3번) 관리자 판정 근거가 두 곳이다. 앱은 `app_metadata.is_admin` 또는 `public.users.is_admin`, RLS `is_admin()`은 `public.users`만 본다. `is_admin()`은 노출 스키마의 `SECURITY DEFINER` 함수이고, `public.users`는 관리자만 들어 있어 회원 목록으로 오해하기 쉽다.

### 동작·데이터

- (해결: 4·5단계, 방문자는 있는 다이어리면 안내 화면·없으면 404, 본문은 관리자 전용 유지) 다이어리 상세는 없는 글·다른 타입 비공개 글에도 404 대신 "비공개 다이어리"를 200으로 보인다. 공개 다이어리도 RLS(`type <> 'diary'`) 때문에 비관리자에게 안 보일 수 있다(기본 스키마 확인 필요).
- (해결: 4단계) 수정 화면(`/article|feed|diary/edit/[slug]`)에서 없는 slug는 404 대신 500이다. 로그인 후에는 수정 화면이 아니라 목록으로 돌아간다.
- 카테고리 이름 변경·삭제가 트랜잭션이 아니다. 순서 변경(upsert)이 그 사이 삭제된 카테고리를 되살릴 수 있다. 비공개 카테고리 글을 공개 카테고리로 옮기면 바로 공개된다.
- `createPost`의 카테고리 자동 생성은 이름 검증(50자, `/` 금지)을 건너뛴다.
- (해결: 4단계) 글 수정으로 카테고리·slug가 바뀌면 옛 카테고리 목록 캐시를 무효화하지 않는다. `revalidatePath(`/${type}`)`는 아티클에서 없는 경로 `/blog`를 무효화한다.
- 발행 중에도 발행 버튼이 살아 있어 두 번 발행될 수 있다(`PostEditor`가 `createPost`를 transition 밖에서 기다린다).
- 댓글 DELETE 정책이 마이그레이션에 없고, `deleteComment`는 지운 행 수를 확인하지 않아 RLS가 막아도 성공을 돌려준다. 비공개 카테고리 글에는 관리자도 댓글을 못 쓸 수 있다.
- (해결: 5단계) 공개 목록의 댓글 수는 anon 키로 세는데 댓글 조회 정책이 로그인 사용자 전용이라 항상 0일 수 있다. 댓글 액션은 캐시를 무효화하지 않는다.
- 아티클 "전체 글" 수가 카테고리별 합계라 카테고리 없는 공개 글이 빠진다(`getPublicPostCounts`).
- 피드 댓글 화면이 없다. (해결: 5단계) 피드 카드의 좋아요 수·댓글은 하드코딩이다.
- 조회수(`view_count`)를 올리는 코드가 없다.
- (해결: 4단계) 날짜를 UTC로 표시해(`toISOString().slice(0, 10)`, 서버 `toLocaleDateString`) KST 오전에 쓴 글이 전날로 보인다. 표지 이미지 규칙도 화면마다 다르다(홈은 썸네일만, 아티클은 썸네일 → 첫 이미지, 피드는 첫 이미지).
- 다이어리 달력: 날짜 필터는 KST, 월 필터·라벨은 브라우저 시간대라 월 경계에서 어긋날 수 있다.
- 기본 스키마(테이블·`is_admin()`·기본 RLS·Storage 버킷)가 `supabase/migrations/`에 없다.

### 성능·SEO

- (해결: 5단계) ISR이 사실상 꺼져 있다. 목록·상세가 `getViewer`(쿠키)를 읽어 매 요청 동적 렌더링된다.
- (해결: 9단계, 아티클 목록은 5단계) 로그인 요청마다 Auth 서버 왕복이 두 번이고(`proxy.ts`·`getViewer`), 아티클 목록의 조회 3개가 차례로 실행되며, 상세의 댓글 조회가 글을 한 번 더 읽는다.
- (해결: 5단계) 공개 fetch의 revalidate 기본값이 60초라 세그먼트의 86400초와 어긋난다.
- 관리자 아티클 목록·피드·다이어리 목록은 본문까지 전부 읽는다(페이지네이션 없음).
- (해결: 5단계, 아티클 상세) 상세 페이지에 `generateMetadata`가 없어 글 제목이 `<title>`·OG에 안 들어간다.
- sitemap은 공개 아티클 1000개에서 잘리고 본문(`content`)까지 읽는다. (해결: 5단계) 60초마다 다시 만들어질 수 있다.

### 기타

- 헤더·모바일 메뉴의 검색 입력이 동작하지 않는다. `BackButton`은 뒤로 가지 않고 항상 `fallbackHref`로 이동한다.
- (해결: 5단계, 액션 삭제) `getComments`는 쓰는 곳이 없다.
- 오류 응답에 `DB Error: <원문>`을 그대로 돌려준다.
- `globals.css`에 `@custom-variant dark`가 없어 `dark:` 유틸리티는 OS 설정을, 색 토큰은 next-themes의 `.dark`를 따른다. `ThemeToggle`은 `theme`을 봐서 시스템 테마일 때 첫 클릭에 바뀌지 않을 수 있다.
- (해결: 4단계) 목록·홈 `loading.tsx`가 하위 경로에도 적용돼 상세·쓰기·로그인 화면에 엉뚱한 스켈레톤(목록·홈)이 뜬다.
