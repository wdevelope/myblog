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
- [x] 10. 관리자 판정 단일화와 `public.users` 정리 — RLS `is_admin()`·`getViewer` 모두 `app_metadata.is_admin`, `public.users` 삭제(운영 DB 적용, 2026-10-22, 10절)
- [ ] 11. 관리자 화면을 직접 켜고 끄기 — 1~4 구현·운영 배포, 관리자 로그인 상태 브라우저 확인(2026-10-22). 로그아웃 확인과 배포 뒤 꺼진 관리자 이동의 캐시 측정이 남았다(11절)
- [ ] 12. 에디터 라이브 프리뷰 — 미리보기 패널을 없애고 작성 칸에 바로 서식을 보인다(CodeMirror 6). 1~4 구현(2026-10-22). 실제 한글 IME 입력과 이미지 붙여넣기 업로드의 브라우저 확인이 남았다(12절)
- [ ] 13. 개발 DB 분리 — 개발 프로젝트 `myblog-dev` 생성, 빠진 기준 마이그레이션 3개 복원, 운영과 구조 일치(카탈로그 13개 범주 해시 동일), 가짜 데이터 seed(2026-10-22). 남은 일: `.env.development.local`·테스트 계정(사용자), 개발 서버 확인(13절)
- [ ] 14. 관리자 로그인 때 관리자 화면 켜기와 켠 상태의 속도 — 로그인 때 켜기 구현, 켠 상태의 속도 개선은 하지 않기로 함(2026-10-22). 관리자 로그인 직후 켜짐의 브라우저 확인이 남았다(14절)
- [ ] 15. 에디터 이미지 크기·정렬·삭제 툴바 — 1~4 구현, 로그인 없는 임시 화면으로 실제 브라우저 확인(2026-10-22). 실제 글 저장 뒤 상세 화면 확인이 남았다(15절)
- [ ] 16. 글을 쓴 직후 방문자의 첫 요청이 이전 목록을 받는 문제 — 태그를 `updateTag`로 바로 만료하고, 효과가 없던 목록 `revalidatePath`를 주소로 고쳤다. 개발 서버에서 저장 직후 첫 요청에 새 글이 보이는 것을 확인했다(2026-10-22). 배포 뒤 운영 확인이 남았다(16절)
- [ ] 17. 마이페이지와 프로필 사진 — 1~4 구현, 개발·운영 DB 마이그레이션, 일반 계정 브라우저 확인, 운영 배포(2026-10-22). 실제 탈퇴 확인이 남았다(17절)
- [ ] 18. 닉네임과 프로필 사진 바꾸기 — 1~7 구현, 개발·운영 DB 마이그레이션과 확인, 일반 계정 브라우저 확인, 운영 배포(2026-10-22). 실제 가입·탈퇴, 관리자 되돌리기의 운영 확인이 남았다(18절)

## 진행 원칙 (2~8단계)

- 순서: 보안(2) → 체감 속도(3·5) → 코드 품질(6~8). 4단계는 5단계가 기댈 조회·무효화·공용 규칙을 먼저 모으는 선행 작업이다.
- 단계를 시작할 때 그 단계의 짧은 계획을 확인받는다. 동작이 바뀌지 않는 정리와 동작 변경(버그 수정)은 커밋을 나눈다.
- 공통화는 실제로 두 곳 이상 같은 코드만 한다. 세 글 타입의 목록 화면(그리드·카드·달력)은 구성이 달라 합치지 않는다.

## 1. Supabase 백업과 운영 주소 정리

- 2026-10-21 오전에는 `mgyoglaujbxfbuxxlcfj.supabase.co`가 DNS에서 조회되지 않았고(NXDOMAIN), 같은 날 오후에는 REST 엔드포인트가 401로 응답한다(프로젝트 활성). 대시보드에서 상태를 확인한다.
- `pg_dump`로 스키마·데이터를, Storage 버킷(`post-images-public`·`post-images-private`) 파일을 백업한다. 기본 스키마가 저장소에 없어서 덤프가 유일한 원본이다.
- 2단계 수정은 로컬 main에만 있고 아직 배포 전이다. 배포 전까지 운영 중인 Vercel 배포는 보안 1~4가 열린 상태다.
- 도메인: 2026-10-22 `w-owen.com`을 Vercel에서 샀다. `www.w-owen.com`이 운영 주소이고 apex는 308로 www에 보낸다. 옛 `w-life.store`는 만료됐다(2026-10-21 whois 등록 가능). 코드 기본값(`SITE_URL`)·CLAUDE.md·README·`.env.example`은 새 주소로 바꿨다. Vercel 환경변수 `NEXT_PUBLIC_SITE_URL`과 Supabase Auth의 Site URL·Redirect URLs를 `https://www.w-owen.com`으로 맞추고 다시 배포한다(sitemap·robots·메타데이터·로그인 리다이렉트 기준). `NEXT_PUBLIC_`은 빌드 때 박히므로 환경변수만 바꾸고 재배포하지 않으면 반영되지 않는다.
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
> - 3번: `20261022040000_drop_public_users.sql`(`drop table … restrict`)을 운영 DB에 적용했다(이력 이름 `drop_public_users`). 계획과 다르게 2번 배포 전에 지웠다. 이미 배포된 `c163ed6`(Vercel 상태 "Deployment has completed")의 `getViewer`도 관리자는 `app_metadata`로 먼저 판정하고, 테이블은 일반 사용자일 때만 읽어 오류면 비관리자로 떨어지기 때문이다. 1단계 전체 백업 대신 이 테이블만 정의·정책·트리거·권한·데이터(관리자 1행)를 SQL로 떠 로컬 `tmp/backup/public_users-20261022.sql`(git 제외)에 두었다. 지우기 전 DB 안에서 이 테이블을 읽는 함수·뷰가 없음을 확인했고, 지운 뒤 관리자·일반 계정 판정과 anon 공개 조회(REST 200), `users` 요청의 `PGRST205`를 확인했다.
> - 확인하지 못한 것: 운영 관리자 화면에서 비공개 글이 보이는지(관리자 로그인이 필요하다).

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

> **결과** (2026-10-22): 1~4 구현, 운영 배포(다른 세션의 `e567dd9` 푸시에 함께 실려 10:44 배포).
> - 커밋: 1 `3770361`(`useSessionUser`), 2 `3feae40`(토글·자동 켜기 제거), 3 `8f85fcd`(저장 뒤 켜기), 4 `109c2ae`(진행 막대). 테스트 173 → 187개.
> - `npm run build`: `SiteHeader`가 `draftMode()`를 읽은 뒤에도 `/`·`/article`·`/feed`·`/diary`는 ○, 상세·카테고리는 ●로 그대로다.
> - 브라우저(방문자, 데스크톱·모바일 폭): 토글과 진행 막대가 없고 헤더·모바일 메뉴가 전과 같다.
> - 브라우저(관리자 로그인, `next dev`, 모바일 폭·데스크톱 1280px·다크 모드, 로그인은 사용자가 했다)
>   - 로그인 직후 꺼짐이고, 아티클 목록은 방문자와 같은 공개 글 1개다.
>   - 켜기: 새로고침 없이 "아티클 쓰기"와 비공개 글을 포함한 52개가 나온다. 메뉴 버튼에 점이 찍히고 이름이 "메뉴 열기(관리자 화면 켜짐)"가 된다. 새 탭도 켜져 있다(피드 쓰기·카드 메뉴).
>   - 진행 막대: 켠 상태에서 상세를 누르면 약 166ms에 뜨고 주소가 바뀌면 사라진다(dev에서 이동 약 790ms). 끈 상태에서는 뜨지 않는다.
>   - 끄기: 쓰기 버튼과 점이 사라지고 방문자 화면이 된다. 켠 채 열었던 비공개 상세는 끈 뒤 새로고침하면 404다(알아 둘 점 그대로).
>   - 데스크톱: 토글이 로그아웃 바로 왼쪽에 같은 높이(40px)로 놓인다. 켜짐은 primary 배경(12%)·글자, 꺼짐은 surface이고 다크 모드에서도 구분된다.
>   - 저장 뒤 켜기: 끈 채 비공개 아티클(`post-fcaddf`)을 내용 그대로 다시 발행하면 `POST /api/admin-mode` 204 뒤 상세로 가고(404 아님) 토글이 켜짐으로 바뀐다.
> - 남은 확인: 로그아웃(Supabase 기본 `signOut()`이 모든 기기 세션을 끊어 하지 않았다), 운영에서 꺼진 관리자 이동의 `x-vercel-cache: HIT`.
> - 함께 한 방문자 경로 수정(별도 커밋 `a120e49`·`4fd317b`): `proxy.ts` matcher를 세션 쿠키·옛 주소로 좁혀 운영의 방문자 응답(TTFB, 연결 재사용)이 약 100ms → 14~30ms가 됐다. 세션 쿠키가 있는 요청은 여전히 약 130ms(콜드 320ms)다.

## 12. 에디터 라이브 프리뷰 (미리보기 패널 → 작성 칸에 바로 서식)

- 근거(2026-10-22, 사용자 요청): 쓰기·수정 화면에서 오른쪽 미리보기를 따로 보지 않고, 작성 칸에서 바로 서식이 보이게 한다. 지금의 `<textarea>`는 글자마다 굵기·크기를 줄 수 없어 편집기를 바꿔야 한다.
- 결정(2026-10-22, 사용자)
  - CodeMirror 6 라이브 프리뷰로 한다. 리치 텍스트 WYSIWYG(Tiptap·Milkdown)는 고르지 않았다. 문서 모델과 마크다운을 오가는 변환이 기존 글 135개의 원문을 다시 쓸 수 있고, `==`·`++`·`$`를 노드로 새로 만들어야 하며, 8단계에서 걷어낸 CKEditor 방식으로 돌아간다.
  - 미리보기 패널(데스크톱 좌우 분할, 모바일 작성·미리보기 탭)은 없앤다.
- 방향: 바뀌는 것은 작성 칸 하나다.
  - 그대로 두는 것: 저장 형식(마크다운 원문), 글 화면 렌더러(`renderMarkdown`, `html: false`), 툴바 구성, 툴바 동작 순수 함수(`lib/markdown-edit.ts`), `MarkdownEditor`의 props, `PostEditor`.
  - 원문을 보이는 곳: 커서(선택 영역)가 걸친 줄은 기호가 모두 보인다. 여러 줄 블록(코드블록, `$$` 수식)은 커서가 블록 안에 있으면 블록 전체가 원문이다. 나머지 줄은 기호를 숨기고 서식을 입힌다.
  - 커서 밖의 표시
    - 굵게·기울임·취소선·밑줄·형광펜·인라인 코드: 기호를 숨기고 서식을 입힌다. 형광펜·밑줄·인라인 코드 색은 글 화면(`.markdown-body`)의 토큰을 같이 쓴다.
    - 제목 1~3: `#`을 숨기고 글자를 키운다. 인용: `>`를 숨기고 왼쪽 선을 긋는다. 글머리 목록: `-`를 `•`로 보인다. 번호 목록: 그대로. 구분선: 선으로 보인다.
    - 링크: 글자만 링크색으로 보이고 `(주소)`는 숨긴다.
    - 이미지 `![](키)`: 이미지로 보인다. 키는 `coverSrcFromImageKey`로 주소를 바꾼다(비공개 버킷도 관리자 쿠키로 열린다). 커서 줄에서도 경로 없이 이미지만 보인다. 커서가 건너뛰는 한 덩어리라 지우면 문법 전체가 지워지고, 경로를 고치려면 지우고 다시 넣는다. 누르면 이미지 전체가 선택되고 테두리가 생긴다(아래 결과의 사용자 확인).
    - 수식 `$…$`·`$$…$$`: KaTeX로 그린다. 잘못된 수식은 글 화면처럼 오류 표시로 남는다(`throwOnError: false`).
    - 코드블록: 고정폭 글꼴에 배경을 깐다. 펜스 줄(```` ``` ````)은 흐리게 남긴다.
    - 표·체크리스트와 그 밖의 문법: 원문 그대로다.
  - 편집 기능
    - 툴바와 ⌘B·I·K: 문서와 선택 영역으로 `TextSelection`을 만들어 같은 순수 함수를 부르고, 돌아온 `TextEdit`를 트랜잭션 하나로 넣는다. ⌘Z는 CodeMirror 입력 기록(`history`)이 받으므로 `execCommand` 우회를 지운다.
    - 단축키는 CodeMirror keymap에 둔다. 한글 자판에서 수정키와 함께 누르면 CodeMirror가 keyCode의 영문 키 이름으로도 찾으므로 `e.code` 처리를 따로 두지 않는다. 테스트로 확인한다.
    - 이미지 붙여넣기·끌어놓기: `domEventHandlers`에서 받는다. 자리표시자를 넣었다가 업로드 뒤 지금 문서에서 찾아 바꾸는 흐름은 그대로다.
    - 값 연결: 문서가 바뀌면 `onChange`를 부른다. 바깥에서 `value`가 바뀌면(임시저장 불러오기) 문서와 다를 때만 통째로 바꾼다.
    - 그 밖: 지금처럼 본문 길이만큼 늘어나 바깥 화면 하나로 스크롤하고, 툴바는 위에 붙는다. 문단 스타일 선택 상자는 커서 줄의 제목 단계를 따라간다. 작성 칸에 `aria-label="본문"`과 자리표시 문구를 두고, 브라우저 맞춤법 검사를 켜고, 글자는 16px 이상으로 둔다(iOS 확대 방지).
  - 구현: 라이브 프리뷰 확장은 직접 만든다. 문법(`==`·`++`·`$`)과 표시 규칙이 이 블로그 것이라 외부 확장을 맞추는 비용이 더 크다. 장식은 `StateField` 하나가 문서·선택이 바뀔 때마다 다시 만든다. 여러 줄을 덮는 블록 위젯은 ViewPlugin에서 만들 수 없고, 글이 수천 자 규모라 전체를 다시 계산해도 된다.
- 알아 둘 점
  - 작성 칸은 CodeMirror 파서(Lezer, CommonMark + GFM)로, 글 화면은 markdown-it으로 그린다. 그래서 드물게 다르게 보인다. 예: `**"중요"**는`은 글 화면에서 굵게지만(cjk-friendly), 작성 칸에서는 기호가 그대로 보일 수 있다. 미리보기가 없으므로 최종 모습은 저장한 뒤 상세에서 본다.
  - 한글을 조합 중인 줄은 커서 줄이라 늘 원문이다. 조합 중에 기호가 숨었다 나타나며 커서가 튀는 일이 없다.
  - 의존성: `@codemirror/state`·`view`·`commands`·`language`, `@lezer/markdown`(2026-10 기준 모두 최근 두 달 안에 갱신). 쓰기·수정 화면(관리자 전용)에만 실리고 공개 화면 번들은 바뀌지 않는다. 크기는 구현 뒤 빌드에서 잰다.
  - `PostEditor`가 `toAutoTitle`로 `lib/markdown`을 쓰므로, 미리보기를 지워도 편집 화면 번들에서 markdown-it은 빠지지 않는다.

**변경(커밋 단위)**

1. 의존성과 문법 확장: 위 패키지를 더한다. 새 `lib/markdown-syntax.ts`에 Lezer 확장 `Highlight`(`==`)·`Underline`(`++`)·`InlineMath`(`$…$`)·`BlockMath`(`$$…$$`)를 둔다. `==`·`++`는 GFM 취소선(`~~`)과 같은 구분자 방식이다.
   - `lib/markdown-syntax.test.ts`: 각 문법이 해당 노드로 읽힌다. 짝이 없는 `==`·`$`는 글자로 남는다. 인라인 코드 안의 `==`는 서식이 아니다.
2. 라이브 프리뷰: 새 `lib/markdown-live-preview.ts`(장식 `StateField`, 이미지·수식·구분선·글머리 위젯).
   - `lib/markdown-live-preview.test.ts`(`EditorState`만 만들어 장식 범위를 본다)
     - 커서 밖 줄의 `**`는 숨기고, 커서 줄은 그대로 둔다.
     - 선택이 여러 줄에 걸치면 그 줄이 모두 원문이다.
     - 커서가 코드블록·`$$` 블록 안이면 블록 전체가 원문이다.
     - 이미지 키를 주소로 바꾼다. 표는 장식하지 않는다.
3. `MarkdownEditor` 교체: textarea를 CodeMirror로 바꾸고 툴바·단축키·이미지 업로드·값 연결을 옮긴다.
   - 지우는 것: 미리보기 패널, 모바일 작성·미리보기 탭, `useDeferredValue`, `MarkdownContent` import, `applyToTextarea`, textarea 높이 맞춤.
   - 수식 위젯용 KaTeX CSS는 에디터에서 import한다. 작성 칸 스타일(`.cm-*`)은 `globals.css` 토큰으로 쓰고 다크 모드를 맞춘다. `lib/markdown-edit.ts` 머리 주석(textarea·execCommand)을 고친다.
   - `MarkdownEditor.test.tsx`(jsdom)를 CodeMirror 기준으로 다시 쓴다. 지금 6개 시나리오를 옮기고 두 개를 더한다: 툴바로 바꾼 뒤 되돌리면 원래 글이다, 바깥 `value`가 바뀌면 문서가 바뀐다.
4. 문서: CLAUDE.md 구조 절의 에디터 줄, README의 에디터 설명, `MarkdownContent` 머리 주석(에디터 미리보기 언급), 로드맵 진행 현황과 이 절의 결과.

**착수 전에 정할 것** — 결정(2026-10-22, 사용자): 1·2 모두 (a)

1. 원문을 보이는 범위
   - (a) 커서가 있는 줄. 블록은 블록 전체(권장). 어디가 원문인지 예측하기 쉽고, 한글 조합 중 커서가 튀지 않는다.
   - (b) 커서가 있는 요소만(Obsidian 방식). 같은 줄의 다른 서식은 유지된다. 다만 커서가 기호 경계를 넘을 때마다 글자가 밀려 커서가 튀고, 조합 중에도 일어날 수 있다.
2. 커서 밖 링크를 눌렀을 때
   - (a) 이동하지 않고 커서만 들어간다(권장). 편집 중에 실수로 화면을 떠나지 않는다.
   - (b) ⌘·Ctrl 클릭이면 새 탭으로 연다. 클릭 처리가 하나 늘고, 모바일에는 해당이 없다.

**확인**

- `npm run lint && npm run typecheck && npm test`.
- `npm run build`(DB 접속 필요): 공개 화면의 정적 여부(○·●)가 그대로인지 보고, 편집 화면 번들 크기를 바꾸기 전과 비교한다.
- 브라우저(데스크톱, 모바일 폭, 다크 모드). 쓰기·수정 화면은 관리자만 열리므로 로그인은 사용자가 한다.
  - 툴바 버튼마다 원문이 바뀌고 커서 밖에서 서식으로 보인다. 툴바로 바꾼 뒤 ⌘Z로 되돌린다.
  - 한글 입력: 굵게 안·줄 끝에서 조합, 조합 중 ⌘B.
  - 이미지 붙여넣기·끌어놓기·툴바 업로드. 비공개 글의 비공개 버킷 이미지가 보인다.
  - 인라인·블록 수식, 잘못된 수식.
  - 기존 긴 글을 수정 화면으로 열어 입력이 느려지지 않는지 본다. 고치지 않고 저장하면 `content`가 그대로다.
  - 임시저장을 불러오면 본문이 바뀐다.
  - 모바일: 키보드가 올라온 상태의 툴바와 커서 이동.

**하지 않는 것**

- 미리보기 패널을 토글로 남기기(결정).
- 작성 칸 표시를 markdown-it과 똑같이 맞추기(cjk-friendly 규칙 등).
- 표·체크리스트 서식 표시, 표 입력 UI, 코드 문법 강조(8절과 같다).
- 자동완성, 줄 번호, 검색·바꾸기 같은 CodeMirror 부가 기능. 목록에서 Enter를 누르면 다음 기호를 넣어 주는 마크다운 키맵도 넣지 않았다(textarea 때와 같은 동작).

> **결과** (2026-10-22): 1~4 구현, 커밋 전.
> - 테스트: 새 `lib/markdown-syntax.test.ts` 12개, `lib/markdown-live-preview.test.ts` 14개, `MarkdownEditor.test.tsx` 6 → 9개. 전체 29개 파일 222개 통과.
> - 계획과 다르게
>   - `@codemirror/lang-markdown`을 쓰지 않았다. 코드블록 언어용으로 `lang-html`·`autocomplete`까지 딸려 와서, `@lezer/markdown` 파서로 `Language`를 직접 만들었다. 노드 이름은 `Highlight`·`Underline`이다.
>   - 커서 줄도 서식은 입히고 기호만 흐린 색으로 드러낸다. 기호와 본문 글자가 같은 색이면 읽기 어려웠다.
>   - 미리보기 칸이 빠져 작성 칸 폭을 글 상세와 같은 `max-w-4xl`로 맞췄다.
>   - 에디터가 `katex`를 ESM으로 불러와서 글 화면 플러그인이 쓰는 CJS 사본과 함께 두 벌이 실렸다(+74KB gzip). 에디터도 `katex/dist/katex.js`를 불러오게 해 한 벌로 맞췄다(`lib/katex-cjs.d.ts`).
> - `npm run build`: 공개 화면의 정적 여부(○·●)는 그대로다. 쓰기 화면 JS는 285 → 389KB(gzip, 클라이언트 참조 청크 합)이다. CodeMirror는 쓰기·수정 화면 6곳에만 실리고, 공개 화면에는 없다(아티클 상세 108KB 그대로).
> - 브라우저(`next start`, 관리자 세션이 남아 있던 브라우저 창, 데스크톱·모바일 폭·다크 모드)
>   - 확인한 것: 서식·커서 줄 기호·수식·이미지·구분선·코드블록·표 표시, 입력·⌘B·⌘Z, 임시저장 불러오기, 이미지를 누르면 원문으로 바뀜, 모바일 가로 넘침 없음.
>   - 기존 글(1,791자) 수정 화면에서 본문이 바뀌지 않았고, 커서를 옮길 때 장식을 다시 만드는 데 0.42ms가 걸렸다.
> - 남은 확인
>   - 실제 한글 IME 조합 입력. 자동화 도구는 조합 이벤트를 만들지 못한다.
>   - 이미지 붙여넣기·끌어놓기 업로드. 운영 Storage에 올라가므로 하지 않았고, jsdom 테스트로만 확인했다.
>   - iOS 실제 기기.
> - 사용자 확인(2026-10-22): 이미지를 올리면 커서가 그 줄에 남아 원문 경로만 보이고 이미지가 안 보였다. 커서 줄의 이미지는 원문을 두고 그 뒤에 이미지 위젯을 붙이게 고쳤다(재현 테스트 2개). 같은 화면에서 커서가 `!` 바로 뒤에 있었는데, 업로드 뒤 커서는 이미지 문법 끝으로 가는 것이 테스트로 확인돼 재현되지 않았다.
> - 사용자 요청(2026-10-22): 커서 줄에 남은 경로도 숨긴다. 이미지는 커서 줄에서도 위젯으로 바꾸고 `atomicRanges`로 한 덩어리로 묶었다(커서 이동이 건너뛰고 Backspace 한 번에 지운다). 테스트는 한 덩어리 범위·Backspace 2개를 더하고 커서 줄 이미지 2개를 고쳤다. 브라우저 창이 로그아웃 상태라 화면은 jsdom으로만 확인했다.
> - 사용자 확인(2026-10-22): 이미지가 지워지지 않았다. 이미지를 누르면 CodeMirror가 커서를 이미지 앞에 두어, Backspace가 이미지 대신 위쪽 줄바꿈을 지웠다(로그인 없이 에디터만 띄운 임시 화면으로 실제 브라우저에서 재현). 누르면 이미지 전체를 선택하고 테두리를 그리게 고쳤다. 재현 테스트 2개, 실제 브라우저에서 선택과 Backspace 삭제를 확인했고 임시 화면은 지웠다.

## 13. 개발 DB 분리 (개발용 Supabase 클라우드 프로젝트)

- 근거(2026-10-22): Supabase 프로젝트가 `myblog` 하나라 `next dev`도 운영 DB·Storage·Auth에 붙는다. 개발 중 실수(일괄 변환, 마이그레이션, 테스트 글·계정)가 그대로 운영 데이터가 되고, 마이그레이션은 운영에 적용해야만 확인할 수 있다. 무료 플랜이라 자동 백업도 없다.
- 방향(결정 1, 2026-10-22 사용자): 같은 조직(`wdeveloper`)에 개발용 무료 프로젝트 `myblog-dev`(서울 `ap-northeast-2`)를 하나 더 만든다. Docker는 쓰지 않는다. DB·Auth·Storage가 운영과 모두 따로이고, 앱 코드는 그대로 두고 환경변수만 바꾼다. 운영 DB는 배포와 마이그레이션 적용에만 쓴다.
  - 비용: 월 0원(Supabase MCP `get_cost`, 2026-10-22). 무료 플랜의 활성 프로젝트 한도 안이다(`timebank`는 비활성). 만들 때 한도에 막히면 대시보드 안내를 따른다.
  - 환경변수: `next dev`는 `.env.development.local`을 `.env`보다 먼저 읽으므로, 여기에 개발 프로젝트의 `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_ANON_KEY`·`SUPABASE_SERVICE_ROLE_KEY`를 넣으면 개발 서버만 개발 프로젝트에 붙는다. `next build`·Vercel은 그대로 운영이다. `.env*`는 Claude가 읽고 쓰지 않으므로 사용자가 만든다(URL·anon 키는 MCP로 알려 줄 수 있고, service role 키는 대시보드에서 복사한다).
  - 이미지: `next.config.ts`의 원격 패턴이 `NEXT_PUBLIC_SUPABASE_URL`의 호스트와 `*.supabase.co`를 이미 허용해 바꿀 것이 없다.
  - 일시정지: 개발 프로젝트는 7일 동안 쓰지 않으면 일시정지된다. 대시보드에서 다시 켜면 데이터는 그대로다. 운영의 keep-alive Cron은 개발 프로젝트에 걸지 않는다.
  - MCP 대상 구분: 프로젝트가 둘이 되므로 Claude가 Supabase MCP로 DB를 읽고 쓸 때는 개발 프로젝트가 기본이고, 운영(`mgyoglaujbxfbuxxlcfj`)에는 사용자 확인을 받은 마이그레이션 적용과 읽기 전용 조회만 한다.
- 사실 확인(2026-10-22)
  - 운영 마이그레이션 이력(`supabase_migrations.schema_migrations`)에 `init_schema`·`init_storage_buckets`·`create_categories_table`의 SQL 원문이 남아 있다. 저장소에는 이 3개 파일이 없어 지금 마이그레이션만으로는 DB를 만들 수 없다.
  - 저장소 파일과 운영 이력의 버전 번호가 9개 다르다(예: 파일 `20260101190000_add_post_view_count` ↔ 이력 `20260101091433`). MCP로 적용하면 상관없고, `supabase db push`를 쓰려면 맞춰야 한다(결정 3).
  - 운영과 개발 프로젝트 모두 같은 계정의 Supabase MCP로 다룰 수 있어, 구조 비교와 마이그레이션 적용에 CLI·DB 비밀번호가 필요 없다.

**변경(작업 순서)**

1. 개발 프로젝트 생성(저장소 변경 없음): Supabase MCP `create_project`로 `myblog-dev`를 서울 리전에 만든다(비용 0 확인 뒤). 대시보드 Auth 설정에서 Site URL·Redirect URL을 `http://localhost:2025`로 두고, 개발용이라 이메일 확인을 끈다.
2. 기준 마이그레이션 복원: 운영 이력의 SQL 원문으로 빠진 3개 파일을 같은 버전 이름으로 추가한다(`20251228143413_init_schema.sql` 등, 새 파일이라 커밋된 SQL은 고치지 않는다).
3. 개발 프로젝트에 구조 적용과 비교: `supabase/migrations/` 전부를 파일 순서대로 개발 프로젝트에 적용하고(MCP), 운영과 개발의 카탈로그를 비교한다. 테이블·열·제약·인덱스, RLS 정책, `public` 함수·트리거, Storage 버킷과 정책, 확장, 테이블 권한. 운영에만 있는 것(대시보드에서 직접 만든 정책 등)은 새 마이그레이션으로 옮겨 개발에 적용한다(운영에는 이미 있으므로 적용하지 않고 이력만 남긴다). 이 단계가 알려진 문제 "기본 스키마가 저장소에 없다"도 푼다.
4. 개발용 데이터(결정 2): 테스트 계정은 개발 프로젝트 대시보드(Authentication → Add user)에서 관리자 1·일반 1을 만들고, 관리자는 SQL로 `raw_app_meta_data`에 `is_admin: true`를 넣는다. 카테고리(공개·비공개), 아티클·피드·다이어리(공개·비공개), 댓글·대댓글은 `supabase/seed.sql`의 가짜 데이터를 MCP로 넣는다. 이미지는 개발 화면에서 직접 올린다. 테스트 계정 비밀번호는 저장소에 두지 않는다.
5. 문서와 작업 방식: CLAUDE.md·README·`.env.example`에 개발 프로젝트 설정(`.env.development.local`)과 "마이그레이션은 개발 프로젝트에 먼저 적용해 확인한 뒤 운영에 적용한다", MCP 대상 구분 규칙을 적는다.

**착수 전에 정할 것**

1. 개발 DB — 결정(2026-10-22, 사용자): 개발용 Supabase 클라우드 프로젝트. 로컬 Supabase(Docker)와 같은 프로젝트 안 스키마 분리는 하지 않는다.
2. 개발 데이터: (a) 가짜 데이터 seed(권장). 비공개 글·다이어리 원문이 개발 프로젝트에 복사되지 않는다. (b) 운영 데이터를 복사한다. 실제 글로 확인할 수 있지만 다이어리 원문·비공개 글이 개발 프로젝트에도 생기고, 1단계 백업(덤프)을 거쳐야 한다.
3. 마이그레이션 적용 방법: (a) 개발·운영 모두 Supabase MCP `apply_migration`(권장, 지금 방식). (b) `supabase db push`. 프로젝트마다 `supabase link`와 DB 비밀번호가 필요하고, 운영 이력 버전 9개를 먼저 `supabase migration repair`로 맞춘다.

**확인**

- 개발 프로젝트에 마이그레이션 전부가 오류 없이 적용되고, 구조 비교에서 차이가 없다(또는 새 마이그레이션으로 메웠다).
- `.env.development.local`을 둔 `npm run dev`에서 개발 관리자로 로그인해 글·비공개 글·이미지 업로드·댓글을 만들면 개발 프로젝트에만 생기고, 운영 DB의 글·댓글 수와 Storage 파일 수는 그대로인지 본다.
- `npm run lint && npm run typecheck && npm test`.

**하지 않는 것**: 로컬 Supabase(Docker), 같은 프로젝트 안 스키마 분리(Auth·Storage가 공유되고 마이그레이션을 두 번 적용해야 한다), Supabase Branching(Pro 유료), Vercel Preview 배포를 개발 프로젝트에 붙이기, 운영 데이터 정기 동기화.

> **결과** (2026-10-22): 결정 2 (a) 가짜 데이터 seed, 결정 3 (a) MCP `apply_migration`. 1~5 완료, 사용자 작업과 개발 서버 확인이 남았다.
> - 1: `myblog-dev`(ref `admadefdkybuvklpezht`, 서울, 월 0원)를 만들었다. 서명 키는 운영과 같은 ES256이다. Auth 설정(Site URL·이메일 확인)은 대시보드에서 사용자가 바꾼다(지금은 가입 허용·이메일 확인 켜짐).
> - 2: `20251228143413_init_schema`·`20251228143554_init_storage_buckets`·`20251230144431_create_categories_table`을 운영 이력 원문 그대로 추가했다(md5 일치).
> - 3: 마이그레이션 15개를 파일 순서대로 개발 프로젝트에 적용했고 모두 오류 없이 끝났다. 운영과 개발의 카탈로그(테이블·열·제약·인덱스·정책·함수·함수 권한·트리거·테이블 권한·버킷·확장·스키마 권한·기본 권한)를 범주별 해시로 비교해, 운영에만 있던 정책 `comments_delete_owner`(대시보드에서 만든 것)를 `20261022050000_comments_delete_owner.sql`로 옮겨 개발에만 적용했다. 그 뒤 13개 범주 모두 해시가 같다. 운영에는 같은 정책이 이미 있어 이 파일은 적용하지 않았다(운영 이력에 없다).
> - 4: `supabase/seed.sql`을 개발 프로젝트에 넣었다(카테고리 3, 아티클 공개 4·비공개 1, 피드 2, 다이어리 비공개 2·공개 1). 비로그인 REST로 공개 글 4개·공개 카테고리 2개만 보이는 것을 확인했다. 테스트 계정이 아직 없어 댓글은 비어 있다.
> - 5: CLAUDE.md(금지선의 MCP 대상 구분, 작업 방식의 DB 구조 변경 순서), README(환경 파일 두 개, 개발 DB 절), `.env.example`을 고쳤다.
> - 남은 일: 사용자가 `.env.development.local`(개발 URL·anon·service role 키)을 만들고, 개발 대시보드에서 테스트 계정(관리자·일반)을 만든 뒤 관리자 지정. 그 뒤 seed 재실행(댓글), `npm run dev`로 로그인·쓰기·이미지 업로드가 개발 프로젝트에만 생기고 운영 수는 그대로인지 확인.

## 14. 관리자 로그인 때 관리자 화면 켜기와 켠 상태의 속도

- 근거(2026-10-22, 사용자 요청): 관리자로 로그인하면 바로 관리자 화면이 보여야 한다. 11절 결정 4(로그인 직후 꺼짐)를 바꾼다. 켠 상태의 렌더 속도도 줄인다(11절 "하지 않는 것"에서 넘김).
- 결정(2026-10-22, 사용자): 로그인하는 순간에만 켠다. 로그인이 남은 채 브라우저를 다시 열면 draft 쿠키(브라우저 세션 쿠키)가 없어 꺼져 있고, 토글로 켠다. 브라우저를 열 때마다 관리자 세션을 보고 켜는 방식은 고르지 않았다.

**1. 로그인 때 켜기**

- `LoginForm`: 로그인 결과의 `app_metadata.is_admin`이 true면 이동하기 전에 `enableAdminMode()`를 부른다. 표시용 값이고 켜기는 서버가 `assertAdmin`으로 다시 판정한다. 일반 사용자는 요청하지 않는다. 켜지 못해도 로그인은 끝났으므로 그대로 이동한다.
- 테스트: `app/login/LoginForm.test.tsx`(관리자는 켠 뒤 이동, 일반 사용자는 켜지 않음, 켜기 실패에도 이동).

**2. 켠 상태의 속도 (하지 않음)**

- 결정(2026-10-22, 사용자): 하지 않는다. 켠 상태의 서버 응답 65~177ms(로컬 `next start` 측정)는 관리자 한 명이 쓰기에 충분하고, 방문자 화면과는 상관없다. 아래 근거와 후보는 켠 상태가 답답해지면 다시 볼 때를 위해 남긴다.

- 근거(2026-10-22, 코드와 운영 DB 읽기 전용 조회)
  - draft mode에서는 Next가 데이터 캐시를 모두 건너뛴다(`next@16.4.2`의 `patch-fetch.js`는 `isDraftMode`면 원래 `fetch`를 부르고, `unstable-cache.js`도 캐시를 읽지 않는다). 그래서 켠 상태에서는 공개 조회(`getPublicPost`·`getPublicPosts`)도 매번 DB에 간다. Next 동작이라 바꾸지 않는다.
  - 켠 상태의 페이지마다 `getViewer()`의 `auth.getUser()`가 Auth 서버를 한 번 왕복한다. 9절에서 proxy의 같은 왕복을 `getClaims()`로 바꿔 27~49ms → 1.5~3ms가 됐다.
  - 아티클 상세는 인증 → 글 → 댓글 3번을 차례로 기다린다.
  - 관리자 다이어리 목록은 `getPostsDirectly`가 `*`로 본문까지 읽어 클라이언트 컴포넌트(`DiaryIndexClient`)에 그대로 넘긴다. 화면은 본문을 쓰지 않는데 RSC 페이로드에 실린다. 운영 기준 비공개 다이어리 112개, 본문 약 100KB다.
  - 관리자 아티클 목록도 글 55개를 본문(약 82KB)까지 읽지만, 서버 컴포넌트(`ArticleListItem`)라 브라우저로는 가지 않는다.
- 후보(효과가 큰 순서, 하지 않음)
  1. 읽기 쪽 관리자 판정을 `getClaims()`로 바꾼다. `lib/server/admin.ts`에 JWT 클레임의 `app_metadata.is_admin`만 보는 판정을 두고, `getPreviewViewer`와 `lib/server/posts.ts`의 조회(`getPostsDirectly`·`getPostForRoute`·`getCommentsDirectly`)가 그것을 쓴다. `assertAdmin`·`requireAdmin`(쓰기·service role 앞)은 `getUser()` 그대로다.
     - 근거: 이 조회들은 쿠키 세션 클라이언트(RLS)로 읽는다. PostgREST와 RLS `is_admin()`도 같은 JWT의 서명·만료와 `app_metadata.is_admin`만 본다. 그래서 `getUser()`로 세션 철회를 확인해도 DB가 돌려주는 범위는 같다. 9절이 `getViewer` 전체를 바꾸지 않은 이유(세션 철회가 토큰 만료 전까지 반영되지 않음)는 쓰기 쪽에 그대로 남는다.
     - 바뀌는 것: 다른 기기에서 로그아웃하거나 관리자 권한을 뺀 뒤에도, 액세스 토큰이 만료될 때까지(기본 1시간) 관리 버튼이 보일 수 있다. 눌러도 쓰기는 `assertAdmin`이 막는다. 비공개 글은 지금도 RLS가 같은 토큰으로 보여 준다.
     - 테스트: `lib/server/admin.test.ts`에 클레임 판정(관리자·일반 사용자·토큰 없음·검증 실패)을 더하고, 조회 테스트의 mock을 맞춘다.
     - 기대: 켠 상태의 모든 페이지에서 Auth 왕복 1회(9절 측정 기준 약 25~45ms)가 빠진다.
  2. 관리자 다이어리 목록에서 본문을 뺀다. 관리자용 다이어리 목록 조회는 화면이 쓰는 열만 고른다(`loadDiaryIndex`와 같은 열). 테스트를 먼저 쓴다.
     - 기대: RSC 페이로드가 약 100KB 줄고, 비공개 본문이 목록 응답에 실리지 않는다.
  3. 아티클 상세의 글과 댓글을 한 번에 읽는다. 상세 전용 조회가 댓글을 별칭 임베드(`comment_list:comments(…)`, `created_at` 오름차순)로 함께 가져온다. 비공개 글·다이어리 판정은 지금의 `getCommentsDirectly`와 같게 한다. 수정 화면과 다이어리 상세가 쓰는 `getPostForRoute`는 그대로 둔다. 테스트를 먼저 쓴다.
     - 기대: 상세에서 DB 왕복 1회가 빠진다.
- 하지 않는 것
  - 브라우저를 열 때마다 켜기(위 결정).
  - draft mode의 데이터 캐시 우회를 바꾸기. 켠 상태에서 링크를 미리 받기(`prefetch`)도 하지 않는다. 화면에 보이는 링크마다 동적 렌더와 DB 조회가 붙는다.
  - 관리자 아티클 목록의 본문 읽기 줄이기. 브라우저로 가지 않고 글 수가 적다.
  - 공개 화면을 정적으로 두고 관리자 부분만 브라우저에서 받기. 5절에서 고르지 않은 구조다.
- 확인
  - `npm run lint && npm run typecheck && npm test`.
  - `next start`에서 관리자로 로그인한 상태로(로그인은 사용자가 한다) 켠 상태의 서버 응답을 11절 숫자(65~177ms)와 비교한다. 방문자 수준(7~18ms)은 요청마다 렌더링하는 한 목표가 아니다.

> **결과** (2026-10-22): 1 구현(테스트 3개). 관리자 로그인 직후 토글이 켜짐인지 브라우저 확인이 남았다. 2는 하지 않기로 했다.

## 15. 에디터 이미지 크기·정렬·삭제 툴바

- 근거(2026-10-22, 사용자 요청과 예시 스크린샷): 작성 칸에서 이미지를 누르면 크기 손잡이(오른쪽 아래)와 정렬(왼쪽·가운데·오른쪽)·삭제 툴바가 뜨게 한다.
- 지금: 이미지를 누르면 전체가 선택되고 Backspace로 지운다(12절). 마크다운 `![](키)`에는 크기·정렬을 담을 자리가 없다.
- 방향
  - 저장 형식(결정 1): 이미지 주소 뒤 조각에 담는다. 예: `![](post-images-public:2026-10-22/a.png#w=60&align=center)`. 조각이 없으면 지금과 같아 기존 글은 바뀌지 않는다. 마크다운 문법이 늘지 않아 두 파서(markdown-it·Lezer)는 고치지 않는다.
  - 값 규칙: `w`는 본문 폭 대비 정수 %(10~100, 결정 2), `align`은 `left`·`center`·`right`다. 조각이 이 둘로만 이뤄졌을 때만 옵션으로 읽고, 아니면 주소의 일부로 그대로 둔다(외부 주소의 원래 `#` 보호). 새 순수 함수 `lib/image-options.ts`(읽기·쓰기)를 렌더러와 에디터가 같이 쓴다.
  - 글 화면: `lib/markdown.ts` 이미지 규칙이 조각을 떼고 키를 주소로 바꾼 뒤, 폭은 검증한 정수로 만든 `style="width:60%"`, 정렬은 클래스 `img-align-*`로 붙인다. raw HTML은 계속 끈다. 정렬 CSS는 `globals.css`의 `.markdown-body`에 둔다(정렬한 이미지는 block + 좌우 margin).
  - 작성 칸: 이미지 위젯도 같은 폭·정렬로 그린다. 선택된 이미지에 툴바와 크기 손잡이를 띄운다.
    - 툴바: 왼쪽·가운데·오른쪽 정렬, 삭제. 지금 정렬은 눌린 상태로 보인다. 버튼마다 트랜잭션 하나라 ⌘Z로 되돌린다.
    - 크기 손잡이: 끄는 동안 폭이 바로 바뀌고, 놓을 때 `w`를 한 번 저장한다(5% 단위). 포인터 이벤트라 터치에서도 된다.
  - 업로드는 지금처럼 조각 없이 넣는다.
- 알아 둘 점: 조각을 읽는 것은 이 블로그 렌더러뿐이다. 다른 마크다운 뷰어에서는 크기·정렬이 무시되고 이미지는 그대로 나온다.

**변경(커밋 단위)**

1. `lib/image-options.ts`와 테스트: 조각 읽기·쓰기, 값 검증(범위 밖 폭·모르는 정렬은 버림), 모르는 조각은 주소에 그대로 둔다.
2. 글 화면: `lib/markdown.ts` 이미지 규칙과 `markdown.test.ts`(폭·정렬 반영, 잘못된 값 무시, 조각 없는 기존 글은 그대로), `.markdown-body` 정렬 CSS.
3. 작성 칸: 위젯의 폭·정렬, 선택 시 툴바·손잡이, 정렬·삭제·크기 트랜잭션. `markdown-live-preview.test.ts`(위젯이 폭·정렬을 읽음), `MarkdownEditor.test.tsx`(정렬 버튼이 조각만 바꾸고 ⌘Z로 되돌림, 삭제 버튼). 손잡이 끌기는 브라우저로 본다.
4. 문서: CLAUDE.md 구조 절의 이미지 설명, 로드맵 진행 현황과 이 절의 결과.

**착수 전에 정할 것** — 결정(2026-10-22, 사용자): 1~3 모두 (a)

1. 저장 형식
   - (a) 주소 조각 `#w=60&align=center`(권장). 문법이 늘지 않고, 기존 글·다른 뷰어와 부딪히지 않는다.
   - (b) 속성 문법 `![](키){width=60% .center}`(markdown-it-attrs). 렌더러와 작성 칸 파서를 둘 다 늘리고, 허용할 속성 목록을 따로 지켜야 한다(본문 XSS 경계가 넓어진다).
   - (c) 이미지 제목 `![](키 "w=60 center")`. 글 화면에서 제목이 툴팁으로 뜬다.
2. 크기 단위
   - (a) 본문 폭 대비 %(권장). 데스크톱에서 정한 비율이 모바일에서도 같다.
   - (b) px. 넓은 화면에서 정한 크기가 모바일에서 넘치면 100%로 줄어 비율이 달라진다.
3. 정렬하지 않은 이미지(기본값)
   - (a) 지금처럼 왼쪽(권장). 기존 글이 그대로다.
   - (b) 가운데. 기존 글의 이미지도 모두 가운데로 바뀐다.

**확인**

- `npm run lint && npm run typecheck && npm test`, `npm run build`.
- 브라우저(데스크톱·모바일 폭·다크 모드): 툴바 정렬·삭제, 손잡이 끌기, ⌘Z, 저장 뒤 상세 화면에서 같은 폭·정렬, 기존 글 그대로.

**하지 않는 것**: 캡션, 자르기·회전, 글자 감싸기(float), 이미지 교체 버튼.

> **결과** (2026-10-22): 1~4 구현.
> - 테스트: 새 `lib/image-options.test.ts` 7개, `markdown.test.ts` +2, `markdown-live-preview.test.ts` +1, `MarkdownEditor.test.tsx` +3. 전체 244개 통과.
> - 계획과 다르게: 이미지 위젯이 툴바·손잡이까지 맡아 커져서 `lib/markdown-image-widget.ts`로 나눴다. 위치는 구문 트리로 찾아 장식 필드와 서로 import하지 않는다.
> - 브라우저 확인(로그인 없이 에디터와 글 화면 렌더러만 띄운 임시 화면, `next start`, 확인 뒤 지움)
>   - 데스크톱: 누르면 툴바·손잡이가 뜨고, 가운데 정렬이 `#align=center`로 들어가며, 손잡이를 끌면 `#w=25`로 저장된다. ⌘Z 한 번에 크기만 되돌아갔다.
>   - 글 화면 렌더러: 가운데(좌우 여백 같음)·오른쪽·기본 왼쪽과 폭(30%·20%)이 맞게 그려졌다.
>   - 모바일 폭·다크 모드: 툴바 색이 반전되고, 삭제 버튼이 이미지를 지웠다.
>   - 확인하며 고친 것: 폭을 정하지 않은 정렬 이미지의 틀이 줄 전체로 늘어나 가운데로 가지 않았다(`width: fit-content`). 선택 하이라이트가 이미지와 툴바 글자에 칠해졌다(`user-select: none`). 손잡이가 칸 밖으로 나가 모바일에서 가로 스크롤이 생겼다(모서리 안쪽으로, 툴바는 정렬한 쪽 가장자리에).
> - 남은 확인: 관리자 로그인 상태에서 실제 글을 저장한 뒤 상세 화면의 폭·정렬.

## 16. 글을 쓴 직후 방문자의 첫 요청이 이전 목록을 받는 문제

- 관찰(2026-10-22, `next dev`, 개발 DB): 관리자가 공개 아티클(`post-3c10b3`)을 저장한 뒤 쿠키 없는 첫 `/article`·`/` 요청에 새 글이 없었다. 다음 요청부터 보였다.
- 원인(`next@16.4.2` 코드, 빌드 출력, Next 문서로 확인)
  1. `revalidateTag(tag, "default")`는 stale-while-revalidate다. `default` 프로필의 `expire`가 무한이라, 태그는 낡음으로만 표시되고 만료되지 않는다(`file-system-cache.js`의 `revalidateTag`, `tags-manifest.external.js`). 그래서 다음 요청은 이전 데이터를 받고, 새 데이터는 뒤에서 다시 만든다. Next 문서도 같다. `revalidateTag`는 다음 요청에 낡은 내용을 주고, `updateTag`는 다음 요청이 새 데이터를 기다린다.
  2. 목록 경로의 `revalidatePath`는 아무것도 무효화하지 않는다.
     - `type`을 주면 Next는 파일 구조 경로로 태그를 만든다. `revalidatePath("/article", "page")`는 `_N_T_/article/page`가 된다.
     - 목록 페이지는 route group 안에 있어서 실제 태그는 `_N_T_/article/(list)/page`와 주소 태그 `_N_T_/article`이다(빌드 출력 `.next/server/app/article.meta`의 `x-next-cache-tags`). 그래서 둘이 맞지 않는다.
     - `/`(`(home)`)·`/feed`·`/diary`도 같다. 4단계에서 목록을 route group으로 옮긴 직후(`73fb59d`) 쓴 코드다(`0f1bdeb`).
  3. 상세의 `revalidatePath("/article/<slug>")`는 주소 태그 `_N_T_/article/<slug>`와 맞아서 바로 만료된다. 그래서 상세와 댓글은 지금도 첫 요청에 새 내용이 보인다.
- 운영에서도 첫 방문자는 이전 목록을 받는다.
  - `next start`와 Vercel 모두 ISR 페이지 항목에 데이터 태그(예: `posts:public:blog`)가 붙는다. 태그가 낡음이면 이전 HTML을 바로 주고 뒤에서 다시 만든다.
  - 다시 만들 때는 낡은 fetch를 기다려 새로 받는다(`patch-fetch.js`, `prerender-legacy`). 그래서 두 번째 방문자부터 새 목록을 받는다.
  - 개발 서버에는 페이지 캐시가 없지만, fetch 캐시가 같은 규칙을 따른다. 관찰과 맞는다.
  - 영향 범위: 홈, 아티클·피드·다이어리 목록, 카테고리·쪽 번호 목록, sitemap. 글·카테고리·댓글 쓰기 모두 해당한다.

**변경**

1. `revalidatePublicPosts`에서 `revalidateTag(tag, "default")`를 `updateTag(tag)`로 바꾼다.
   - 태그가 바로 만료된다. 그 태그가 붙은 모든 공개 페이지(목록·카테고리·쪽 번호·홈·sitemap·상세)는 다음 요청 때 새로 만든다.
   - 다시 만드는 횟수는 지금과 같다(지금도 다음 방문 때 뒤에서 다시 만든다). 달라지는 것은 페이지마다 첫 방문자가 렌더를 기다린다는 점뿐이다. 댓글 쓰기도 같다.
   - 부르는 곳 8곳은 모두 `"use server"` 모듈이 내보내는 서버 액션이다(`lib/actions/posts.ts` 2곳, `categories.ts` 4곳, `comments.ts` 2곳). 라우트 핸들러에서 부르는 곳은 없다. 라우트 핸들러에서 `updateTag`를 부르면 throw하므로, 함수 주석에 "서버 액션에서만 부른다"를 적는다.
2. 목록 경로 `revalidatePath`를 결정 1대로 고친다.
3. 테스트를 먼저 바꿔 실패를 확인한다.
   - `publicPosts.test.ts`: `updateTag`로 태그를 만료하는지, `revalidateTag`는 부르지 않는지, 목록 경로를 `type` 없이 부르는지 본다.
   - `posts.test.ts`·`comments.test.ts`·`categories.test.ts`: `next/cache` mock에 `updateTag`를 더하고 기대값을 바꾼다.
4. 문서: CLAUDE.md 쓰기 줄에 "태그는 `updateTag`라 서버 액션에서만", 이 절의 결과.

**착수 전에 정할 것**

1. 목록 경로 `revalidatePath`
   - (a) `type`을 뺀다(권장). `revalidatePath("/")`, `revalidatePath("/article")`처럼 쓰면 실제 주소 태그(`_N_T_/`·`_N_T_/article`)와 맞는다. 변경 1만으로도 목록은 새로 보인다. 다만 지금 이 호출은 효과가 없는데도 효과가 있는 것처럼 보이고, 태그 없이 읽는 목록이 생길 때 안전망이 된다.
   - (b) 지운다. 모든 공개 페이지에 데이터 태그가 붙어 있어 변경 1과 겹친다.

**확인**

- `npm run lint && npm run typecheck && npm test`.
- 개발 서버: 관리자가 공개 아티클을 저장한 직후, 쿠키 없는 첫 요청(`curl`)으로 `/article`·`/`·그 카테고리 목록에 새 글이 있는지 본다. 관리자 저장은 사용자가 한다.
- 운영: 배포한 뒤 사용자가 글을 쓰면, 첫 방문 요청에 새 글이 있는지 본다. `next start`(포트 2026)는 운영 값을 쓰므로 거기서 글을 쓰는 확인은 하지 않는다.

**하지 않는 것**: `cacheComponents`·`'use cache'`로 옮기기, 카테고리 태그 정리(모든 카테고리 페이지에 타입 태그가 같이 붙어 지금도 겹친다), 세그먼트 `revalidate` 바꾸기.

> **결과** (2026-10-22): 1~4 구현. 결정 1은 (a)(사용자).
> - 테스트: 먼저 바꾼 6개가 고치기 전에 실패하는 것을 확인했다. `publicPosts.test.ts`에 2개를 더해 전체 246개가 통과한다.
> - 개발 서버(`next dev`, 개발 DB)
>   - 목록 3곳(`/`·`/article`·`/article/category/일상`)을 먼저 요청해 캐시를 채웠다.
>   - 사용자가 `일상`에 공개 아티클(`post-0f7f68`, 13:21:21 저장)을 썼다.
>   - 8초 뒤 쿠키 없는 첫 요청에서 세 목록 모두 맨 앞에 새 글이 있었다.
> - 남은 확인: 배포한 뒤 운영에서 글을 쓰고, 첫 방문 요청에 새 글이 있는지 본다.

## 17. 마이페이지와 프로필 사진

- 근거(2026-10-22, 사용자 요청): 마이페이지를 만든다. 프로필 사진은 관리자만 오웬 로고(`/logo.png`)이고, 다른 사용자는 기본 사람 모양 아이콘이다.
- 지금
  - 로그인 사용자를 위한 화면이 없다. 헤더는 로그인하면 "로그아웃" 버튼만 보인다.
  - 댓글 아바타는 작성자와 상관없이 모두 `/logo.png`이고, 이름은 `사용자 <id 앞 6자>`다.
  - 댓글 목록은 정적 HTML이라 anon 키로 읽는다. 작성자가 관리자인지는 `auth.users`(`app_metadata`)에만 있어 지금은 알 수 없다.
- 방향
  - 아바타 규칙: 관리자면 오웬 로고, 아니면 사람 아이콘(`react-icons`의 `FiUser`, 이미 쓰는 의존성). 그리는 곳은 공용 `UserAvatar` 하나다. 사진 올리기는 하지 않는다.
  - 댓글의 관리자 여부: `comments.author_is_admin boolean not null default false` 열을 더한다. BEFORE INSERT 트리거가 쓰는 사람의 JWT로 `is_admin()` 값을 넣는다(클라이언트가 보낸 값은 덮어쓴다). 댓글은 UPDATE 정책이 없어 바꿀 수 없다. 기존 댓글은 마이그레이션에서 `auth.users.raw_app_meta_data`로 채운다. 관리자 지정이 나중에 바뀌어도 이미 쓴 댓글의 값은 그대로다.
  - 헤더: 로그인하면 아바타 버튼이 `/mypage`로 간다(결정 2). 모바일 메뉴에도 "마이페이지"를 더한다. 헤더의 관리자 판정은 브라우저 세션의 `app_metadata.is_admin`으로, 표시용이다(권한은 지금처럼 서버가 본다).
  - `/mypage`: `requireLogin`, 동적 렌더링, `noindex`. 아바타, 이메일, 가입일(KST), 관리자 표시, 로그아웃. 그 밖의 기능은 결정 1.
- 기능 후보(결정 1)
  - 내 댓글 목록: RLS 서버 클라이언트로 `comments` + `posts(slug,type,title)`를 최신순으로 읽어 글 링크와 삭제 버튼(기존 `deleteComment`)을 보인다.
  - 비밀번호 변경: 브라우저 클라이언트 `auth.updateUser({ password })`(8자 이상·확인 입력, 로그인 폼과 같은 규칙).
  - 닉네임: 닉네임 표를 새로 만들고(공개 읽기·본인 쓰기 RLS), 댓글 조회가 그것을 같이 읽고, 닉네임을 바꾸면 그 사용자가 댓글을 단 글의 캐시를 모두 무효화해야 한다. DB·캐시 변경이 커서 따로 하기를 권한다.
  - 회원 탈퇴: service role로 `auth.admin.deleteUser`를 불러야 한다(`service.ts`의 `requireAdmin` 뒤 규칙에 새 예외). 댓글이 cascade로 지워져 그 글들의 캐시도 무효화해야 한다. 따로 하기를 권한다.
    - 고른 뒤의 설계: 서버 액션 `deleteAccount`가 `getViewer`로 확인한 본인 id만 지운다(입력을 받지 않는다). 관리자는 탈퇴할 수 없다(관리 계정을 잃지 않게). 지우기 전에 RLS 클라이언트로 내 댓글이 달린 글(slug·type)을 읽어 두고, 지운 뒤 `revalidatePublicPosts`로 그 글들을 무효화한다. 브라우저는 성공하면 로컬 세션을 지우고 홈으로 간다. 확인은 `confirm` 창이다(댓글 삭제와 같다).

**변경(커밋 단위)**

1. DB: `supabase/migrations/<시각>_comments_author_is_admin.sql`(열·트리거·기존 댓글 채우기). 개발 프로젝트에 먼저 적용해 확인하고, 운영 적용은 사용자 확인 뒤.
2. 댓글 아바타: `Comment.authorIsAdmin`, `getPublicComments`·`getCommentsDirectly`·`createComment`가 열을 읽는다. `UserAvatar`, `CommentsThread`가 작성자별 아바타·이름을 쓴다(결정 3). 테스트: `publicPosts.test.ts`(열을 고르고 옮김), `CommentsThread.test.tsx`(관리자 댓글은 로고, 일반 댓글은 사람 아이콘).
3. 마이페이지: `app/mypage/page.tsx`와 결정 1의 기능, 헤더·모바일 메뉴 진입점. 조회 함수는 `lib/server/`에 두고 테스트를 쓴다.
4. 문서: CLAUDE.md 구조 절에 한 줄, 로드맵 진행 현황과 이 절의 결과.

**착수 전에 정할 것** — 결정(2026-10-22, 사용자): 1은 내 댓글 목록·비밀번호 변경·회원 탈퇴, 2 (a), 3 (a)

1. 마이페이지 기능: 기본(아바타·이메일·가입일·로그아웃)에 더할 것
   - 내 댓글 목록(권장), 비밀번호 변경(권장), 닉네임, 회원 탈퇴 중에서 고른다.
2. 헤더 진입점
   - (a) 로그인하면 "로그아웃" 버튼 자리에 아바타 버튼을 둔다(권장). 로그아웃은 마이페이지와 모바일 메뉴에서 한다. 홈 히어로의 로그인·로그아웃 버튼은 그대로다.
   - (b) "로그아웃" 버튼을 두고 그 옆에 아바타 버튼을 더한다.
3. 댓글에서 관리자 이름
   - (a) "Owen"으로 보인다(권장). 로고와 이름이 맞는다.
   - (b) 지금처럼 `사용자 <id 앞 6자>`.

**확인**

- `npm run lint && npm run typecheck && npm test`.
- 개발 DB: 마이그레이션 뒤 기존 댓글의 관리자 표시가 맞는지, 일반 계정이 `author_is_admin: true`를 보내도 `false`로 들어가는지(SQL로 역할을 바꿔 확인).
- 브라우저(개발 서버, 로그인은 사용자가 한다): 관리자·일반 계정의 헤더 아바타, `/mypage`, 비로그인 `/mypage`는 로그인으로 보냄, 댓글 아바타, 모바일 폭·다크 모드.

**하지 않는 것**: 프로필 사진 올리기, 이메일 변경, 공개 프로필 페이지(다른 사용자의 마이페이지 보기).

> **결과** (2026-10-22): 1~4 구현. 운영 DB 마이그레이션은 18절과 함께 적용했다(18절 결과의 운영 적용).
> - 1: `20261022060000_comments_author_is_admin.sql`을 개발 프로젝트에 적용했다. 기존 댓글 6개 중 관리자 3개가 `true`로 채워졌다. `authenticated` 역할로 넣어 본 결과(롤백), 일반 계정이 `true`를 보내도 `false`, 관리자 JWT는 `false`를 보내도 `true`였다. 트리거 함수의 EXECUTE를 회수해도 트리거는 돈다. 보안 어드바이저에 새 경고는 없다. `seed.sql`의 관리자 대댓글은 `author_is_admin = true`로 넣는다(seed는 postgres라 트리거가 값을 두고 간다).
> - 계획과 다르게: 이름 규칙을 댓글과 마이페이지·헤더가 같이 써서 `userDisplayName`(`lib/utils.ts`)으로 뺐다. `MyComment` 타입은 클라이언트 목록도 쓰므로 `lib/types.ts`에 뒀다. 모바일 메뉴의 진입점은 아바타 없이 "마이페이지" 글자 버튼이다.
> - 테스트: 새 `lib/server/account.test.ts` 2개, `lib/actions/account.test.ts` 5개, `app/mypage/PasswordChangeForm.test.tsx` 2개, `CommentsThread.test.tsx` +1, `utils.test.ts` +1. `posts.test.ts`·`publicPosts.test.ts`는 `author_is_admin`을 읽고 옮기는지 본다. 전체 257개 통과.
> - 브라우저(`next dev`, 개발 DB): 비로그인 `/mypage`는 `/login?from=%2Fmypage`로 간다. `post-dev001` 댓글은 일반 계정이 사람 아이콘·`사용자 835373`, 관리자 대댓글이 로고·`Owen`이다(라이트·다크, 모바일 폭). 헤더 아바타(관리자 로고)와 모바일 메뉴의 "마이페이지"를 봤다.
> - 로그인한 `/mypage`(일반 계정, 로그인은 사용자가 했다): 사람 아이콘·`사용자 835373`·이메일·가입일·로그아웃, 내 댓글 3개(글 제목 링크·삭제), 비밀번호 변경, 회원 탈퇴가 보인다. 좁은 폭(422px)에서 가로 넘침이 없고 다크 모드도 맞다. 넓은 폭 헤더는 사람 아이콘만 있고 관리자 토글은 없다.
>   - 처음에는 패널의 세션이 서버에서 무효라(클라이언트 쿠키는 남아 헤더는 로그인 상태) `/mypage`·`/article/write` 모두 로그인으로 갔다. 다시 로그인한 뒤 열렸다. 이번 변경과 상관없는 기존 동작이다.
> - 남은 확인: 실제 탈퇴(계정이 지워지므로 지워도 되는 테스트 계정으로), 관리자 계정의 `/mypage`(탈퇴 카드 없음·로고·관리자 배지).

## 18. 닉네임과 프로필 사진 바꾸기

- 근거(2026-10-22, 사용자 요청): 일반 사용자가 마이페이지에서 닉네임과 프로필 사진을 바꾼다. 한 단계로 계획하고 커밋은 닉네임과 사진으로 나눈다. 이어서 회원가입 때 닉네임을 받고 중복확인을 넣기로 했다.
- 지금(17절과 개발 DB 조회, 2026-10-22)
  - 이름은 `userDisplayName`(관리자 Owen, 그 외 `사용자 <id 앞 6자>`)이고, 아바타는 `UserAvatar`(관리자 로고, 그 외 사람 아이콘)다. 사용자별로 저장한 값이 없다.
  - 댓글 목록은 정적·ISR이라 anon 키로 읽고 `auth.users`는 읽지 못한다. 이름이나 사진이 바뀌면 그 사람이 댓글을 단 글의 공개 캐시를 다시 만들어야 한다.
  - Storage에는 글 이미지 버킷 둘뿐이고 `storage.objects`에 정책이 하나도 없다(업로드는 관리자 전용 `app/api/images`가 service role로 한다). 버킷에 크기·형식 제한도 없다.
  - `storage.objects`는 `auth.users`를 참조하지 않는다. 그래서 계정을 지워도 파일은 남는다. `auth.users`에는 트리거가 없다.
- 방향
  - DB: 새 표 `public.profiles`
    - 열: `id`(`auth.users` 참조, 계정과 함께 삭제), `nickname`(없으면 지금 이름), `avatar_path`(없으면 사람 아이콘).
    - 행 만들기: 가입하면 `auth.users` AFTER INSERT 트리거가 행을 만든다. 닉네임은 가입 때 보낸 `raw_user_meta_data.nickname`에서 가져온다. 트리거 함수는 `security definer`, `search_path = ''`이고, anon·authenticated의 EXECUTE를 회수한다. 기존 계정의 행은 마이그레이션에서 닉네임 없이 채운다.
    - 트리거에서 닉네임이 규칙에 어긋나거나 이미 쓰이면 insert가 실패하고, 그러면 가입도 실패한다(결정 5). `user_metadata`는 가입 때 한 번만 읽고, 그 뒤 기준은 `profiles`다.
    - 댓글과 잇기: `comments.author_id`에 `profiles(id)` FK를 더한다. 그러면 댓글 조회가 PostgREST 임베드로 작성자 프로필을 같이 읽어 요청 수가 늘지 않는다.
    - 규칙은 DB가 지킨다. PostgREST를 직접 불러도 같은 규칙이 걸린다.
      - 닉네임: 글자·길이(결정 4), 예약어(결정 1) 금지, 대소문자를 무시한 중복 금지(`lower(nickname)` unique 인덱스).
      - `avatar_path`: `<자기 id>/<uuid>.jpg` 모양만 받는다.
    - RLS·권한
      - 읽기는 누구나 한다(anon·authenticated select).
      - 쓰기는 본인 행의 `nickname`·`avatar_path` 열만 고친다(열 단위 `grant update`, `id = auth.uid()`). insert·delete 권한은 주지 않는다(트리거와 cascade가 한다).
      - 10/30 GRANT 변경(1절)에 맞춰 권한을 직접 쓴다.
  - Storage: 공개 버킷 `avatars`(파일 1MB, `image/jpeg`만)
    - 정책: 로그인 사용자는 본인 폴더(`<자기 id>/`)에만 올리고, 본인 폴더 파일만 읽고 지운다. 지우기(`remove`)에 select·delete가 둘 다 필요해서 읽기 정책도 둔다.
    - 화면은 공개 버킷 주소로 그린다. `next.config.ts`의 `*.supabase.co` 원격 패턴에 이미 들어 있다.
  - 표시 규칙
    - 관리자는 지금처럼 로고·Owen이다(결정 2). 판정은 `author_is_admin`이 먼저다.
    - 다른 사용자는 닉네임이 있으면 닉네임, 사진이 있으면 사진을 보인다. `userDisplayName`·`UserAvatar`가 프로필 값을 받는다.
  - 중복확인: DB 함수 `check_nickname(name)`이 `ok`·`invalid`·`reserved`·`taken` 중 하나를 돌려준다.
    - anon도 부른다. 닉네임은 댓글에 공개되는 값이라 있는지 알려 줘도 새는 정보가 없다.
    - `ilike`로 찾으면 닉네임에 쓰는 `_`가 와일드카드가 되므로, 함수 안에서 `lower()`로 같은지 비교한다.
    - 화면은 공용 `NicknameField`(입력 칸 + "중복확인" 버튼 + 결과 문구)를 가입 폼과 마이페이지가 같이 쓴다. 확인한 뒤 글자를 바꾸면 다시 확인해야 저장·가입 버튼이 켜진다.
    - 버튼은 편의용이다. 최종 판정은 저장할 때의 DB 규칙(unique 인덱스·제약)이 한다.
  - 회원가입: 로그인 폼의 가입 모드에 닉네임 칸(필수)을 더한다. 중복확인을 통과해야 가입 버튼이 켜진다. `signUp`의 `options.data.nickname`으로 보내면 트리거가 `profiles`에 넣는다.
  - 마이페이지 프로필 카드: 닉네임 바꾸기와 사진 바꾸기·지우기를 넣는다.
  - 헤더 아바타: 세션에는 프로필이 없다. `AccountButton`이 로그인한 뒤 브라우저 클라이언트로 내 프로필 한 행을 읽는다. 로그인 사용자만, 페이지마다 한 번 읽는다.
  - 사진 올리기
    - 브라우저에서 canvas로 가운데를 정사각형으로 잘라 256px JPEG로 줄인 뒤, 본인 폴더에 새 uuid 이름으로 올린다.
    - 큰 원본이 저장 용량(무료 1GB)을 차지하지 않고, 주소가 매번 달라 캐시가 꼬이지 않는다.
    - JPEG를 고른 이유: Safari가 canvas WebP 인코딩을 지원하지 않을 수 있다.
    - 디코드하지 못하는 파일(일부 HEIC 등)은 안내 문구를 띄운다.
  - 서버 액션(`lib/actions/profile.ts`, zod 검증)
    - `updateNickname`: 규칙을 확인하고 RLS 클라이언트로 저장한다. 중복은 unique 위반(23505)을 "이미 쓰는 닉네임이에요"로 바꾼다.
    - `updateAvatar(path)`: 경로가 `<자기 id>/<uuid>.jpg`이고 그 파일이 내 폴더에 있는지 보고 저장한 뒤, 이전 파일을 지운다.
    - `removeAvatar()`: 사진을 지우고 경로를 비운다.
    - 공통: 저장한 뒤 내가 댓글을 단 글을 무효화한다. 17절 `deleteAccount`의 "댓글 단 글 읽기·무효화"를 공용 함수로 빼서 같이 쓴다(`updateTag`를 쓰므로 서버 액션에서만 부른다).
    - `deleteAccount`는 계정을 지우기 전에 내 `avatars` 폴더 파일도 지운다.
  - 관리 수단(결정 3): `resetUserProfile(userId)`로 관리자가 댓글 옆 버튼을 눌러 그 사용자의 닉네임·사진을 기본값으로 되돌린다.
    - `assertAdmin` 뒤에 service role로 파일을 지우고 값을 비운 다음, 그 사용자가 댓글을 단 글을 무효화한다.
    - 관리자 판정 뒤에만 쓰므로 `service.ts` 규칙의 새 예외는 아니다.
- 알아 둘 점
  - 사용자가 올린 사진이 공개 댓글에 그대로 보인다. 자동 검사는 하지 않는다.
  - 운영은 이메일 확인이 켜져 있다. `auth.users` 행은 가입 요청 때 생기므로, 메일을 확인하지 않은 계정도 닉네임을 차지한다.
  - 기존 계정은 닉네임이 없다. 마이페이지에서 정하기 전까지 지금 이름(`사용자 <id 앞 6자>`)으로 보인다(결정 6).

**변경(커밋 단위)**

1. 정리(동작 그대로): `deleteAccount`에서 "댓글 단 글 읽기·무효화"를 공용 함수로 뺀다. 기존 `lib/actions/account.test.ts`가 그대로 통과한다.
2. DB
   - `supabase/migrations/<시각>_profiles_and_avatars.sql`: 표, 트리거(가입 때 닉네임), 기존 계정 채우기, FK, 규칙, `check_nickname`, RLS·권한, 버킷, Storage 정책.
   - `seed.sql`: seed 일반 계정에 닉네임을 하나 넣는다.
   - 개발 프로젝트에 먼저 적용해 SQL로 확인한다. 운영은 17절 마이그레이션 다음에, 사용자 확인 뒤 적용한다.
3. 닉네임 표시·변경
   - 댓글 조회 두 곳(`getPublicComments`·`getCommentsDirectly`)이 `profiles(nickname,avatar_path)`를 같이 읽어 `Comment`에 담는다.
   - 닉네임 규칙(zod, `lib/nickname.ts`)과 `NicknameField`(중복확인), `userDisplayName`, `updateNickname`, 마이페이지 닉네임 칸, `AccountButton`의 내 프로필 읽기.
   - 테스트
     - 조회가 임베드를 고르고 값을 옮긴다.
     - 이름 규칙: 관리자 > 닉네임 > 기본.
     - 닉네임 규칙: 글자·길이·예약어.
     - `updateNickname`: 형식·예약어·중복 거절, 비로그인 거절, 댓글 단 글 무효화.
     - `NicknameField`: 확인 결과 문구, 확인한 뒤 글자를 바꾸면 다시 확인해야 한다.
     - 댓글 화면에 닉네임이 보인다.
4. 회원가입 닉네임
   - 로그인 폼 가입 모드에 `NicknameField`를 넣고, `signUp`에 닉네임을 실어 보낸다. 트리거가 실패했을 때 오는 Auth 오류("Database error saving new user")를 닉네임 안내 문구로 바꾼다.
   - 테스트(`LoginForm.test.tsx`): 중복확인 전에는 가입 버튼이 꺼져 있고, 확인하면 `signUp`에 닉네임이 실린다.
5. 사진
   - 자르기 영역 계산(순수 함수)과 업로드 컴포넌트.
   - `updateAvatar`·`removeAvatar`, `UserAvatar`의 사진 모양, `deleteAccount`의 파일 삭제.
   - 테스트
     - 자르기 계산.
     - 액션: 남의 경로·없는 파일 거절, 이전 파일 삭제, 무효화.
     - `UserAvatar` 세 가지 모양(로고·사진·아이콘).
6. 관리자 되돌리기(결정 3이 (a)일 때)
   - `resetUserProfile`과 댓글 옆 버튼.
   - 테스트: 관리자가 아니면 거절, 값을 비우고 파일을 지우고 무효화.
7. 문서: CLAUDE.md 구조 절(마이페이지 줄·`profiles`·`avatars`·가입 닉네임), 로드맵 진행 현황과 이 절의 결과.

**착수 전에 정할 것** — 결정(2026-10-22, 사용자): 1~6 모두 (a)

1. 닉네임 예약어
   - (a) 들어 있으면 금지(권장). `owen`·`오웬`·`관리자`·`운영자`·`admin`이 들어간 닉네임을 막는다(대소문자 무시). "Owen_1" 같은 사칭을 막지만, "Bowen"처럼 owen이 들어간 이름도 막힌다.
   - (b) 정확히 같을 때만 금지한다. 비슷한 이름으로 사칭할 수 있다.
2. 관리자 프로필
   - (a) 지금처럼 로고·Owen으로 고정하고, 관리자 마이페이지에는 편집 칸을 두지 않는다(권장).
   - (b) 관리자도 닉네임·사진을 바꾼다. 관리자 표시는 배지처럼 따로 둔다.
3. 관리자 되돌리기(닉네임·사진 초기화)
   - (a) 이번에 같이 넣는다(권장). 부적절한 사진이 공개 댓글에 떠도 바로 내릴 수 있다.
   - (b) 나중에 넣는다. 그 사이에는 SQL Editor로 지운다.
4. 닉네임 글자
   - (a) 한글·영문·숫자·`_`, 2~12자(권장). 공백·이모지는 안 된다.
   - (b) 가운데 공백도 허용한다(앞뒤 공백은 잘라 낸다). 비슷해 보이는 이름이 늘어난다.
5. 중복확인을 통과했는데 가입 순간 같은 닉네임이 먼저 들어간 경우(드묾)
   - (a) 가입을 실패시키고 "다른 닉네임으로 다시 시도"를 안내한다(권장). 가입한 계정은 모두 닉네임이 있다.
   - (b) 닉네임 없이 가입시키고, 나중에 마이페이지에서 정하게 한다. 사용자는 닉네임이 빠진 것을 모를 수 있다.
6. 닉네임이 없는 기존 계정
   - (a) 그대로 둔다(권장). 마이페이지에서 정하기 전까지 `사용자 <id 앞 6자>`로 보인다.
   - (b) 로그인하면 닉네임을 정하라는 안내를 띄운다.

**확인**

- `npm run lint && npm run typecheck && npm test`.
- 개발 DB(SQL, 롤백)
  - `profiles`: 남의 행 수정 거절, 예약어·형식·중복 거절, 남의 폴더 경로 거절, anon 읽기.
  - 행 생성·삭제: 새 계정을 넣으면 행이 생기고(메타데이터의 닉네임 포함), 계정을 지우면 행도 지워진다. 메타데이터 닉네임이 이미 쓰이면 계정 insert가 실패한다.
  - `check_nickname`: anon으로 불러 네 가지 결과가 맞는지 본다(`_`가 들어간 닉네임 포함).
  - Storage 정책: 역할을 바꿔 남의 폴더에 올리기·지우기가 거절되는지 본다.
  - 보안 어드바이저에 새 경고가 없는지 본다.
- 브라우저(개발 서버, 로그인과 파일 선택은 사용자가 한다)
  - 테스트 계정 가입: 중복확인 전에는 가입 버튼이 꺼져 있고, 가입하면 마이페이지·댓글에 그 닉네임이 보인다(가입은 사용자가 한다).
  - 닉네임을 바꾼 직후, 그 사람 댓글이 있는 상세의 첫 요청에 새 이름이 보인다.
  - 사진 올리기·지우기, 헤더 아바타, 관리자 되돌리기.
  - 테스트 계정으로 탈퇴하면 Storage 폴더가 빈다.
  - 모바일 폭·다크 모드.

**하지 않는 것**: 가입할 때 사진 받기, 닉네임 변경 횟수 제한, 메일을 확인하지 않은 계정의 닉네임 회수, 원본 크기 사진 저장, 자를 영역을 고르는 화면, 사진 자동 검사, 다른 사용자의 공개 프로필 화면.

> **결과** (2026-10-22): 결정 1~6 모두 (a). 1~7 구현. 운영 DB에도 적용했다(아래 운영 적용).
> - 커밋: 탈퇴 코드 정리(`0e58766`), DB(`9911f0f`), 닉네임(`85ec0fe`), 가입 닉네임(`becce3d`), 사진(`f7e11de`), 관리자 되돌리기(`4e03639`), zod를 가입 번들에서 뺌(`78f0d4d`). 17절 미커밋 변경은 먼저 4개로 커밋했다(`2ed9d35`~`c493286`).
> - 2: `20261022070000_profiles_and_avatars.sql`을 개발 프로젝트에 적용했다. 롤백 트랜잭션에서 확인한 것:
>   - anon 읽기, 남의 행 수정 0행, 예약어·남의 폴더 경로는 제약 위반(23514), `id` 수정과 행 insert는 권한 없음(42501).
>   - `check_nickname`: `ok`·`invalid`(1자·13자·공백)·`reserved`(`Owen_1`·`관리자님`)·`taken`(대소문자 무시). 본인 닉네임은 `ok`, `memXber`는 `Mem_ber`와 다르다(`_` 와일드카드 아님).
>   - 가입 트리거: 메타데이터 닉네임이 들어가고, 이미 쓰는 닉네임이면 계정 insert가 23505로 실패한다. 계정을 지우면 행도 지워진다. 기존 계정 3개 모두 행이 생겼다.
>   - Storage: 본인 폴더 uuid JPEG만 올라가고, 남의 폴더·다른 이름은 거절된다. SQL로 직접 지우기는 Storage가 막아서 지우기 정책은 브라우저(Storage API)로 확인했다.
>   - 보안 어드바이저에 새 경고는 없다.
> - 계획과 다르게
>   - 닉네임 zod 스키마는 서버 액션 안에 둔다. `lib/nickname.ts`를 가입 폼이 import해서, 거기 두면 공개 번들에 zod가 실린다.
>   - 탈퇴의 사진 파일 삭제는 계정을 지운 **뒤** service role로 한다. 먼저 지우면 탈퇴가 실패했을 때 사진만 사라진다.
>   - 이름·사진 저장 뒤의 무효화 조회가 실패해도 성공으로 돌려준다(저장은 끝났고 그 글들은 ISR 주기 안에 다시 만들어진다).
> - 테스트: 새 `lib/nickname.test.ts`·`lib/avatar.test.ts`·`lib/actions/profile.test.ts`·`NicknameField.test.tsx`·`UserAvatar.test.tsx`, `LoginForm.test.tsx` +2, `account.test.ts` +1, `CommentsThread.test.tsx` +2 등. 전체 289개 통과.
> - 브라우저(`next dev`, 개발 DB, 일반 계정. 로그인은 사용자가 했다)
>   - 닉네임: `Owen팬`은 예약어 안내, `테스트닉`은 확인 뒤 저장 버튼이 켜지고 저장된다. 저장 직후 쿠키 없는 첫 `/article/post-dev001` 요청에 새 닉네임이 들어 있다.
>   - 가입 폼: 이메일 아래 닉네임 칸과 중복확인이 있고, 확인을 통과해도 비밀번호가 없으면 계정 만들기가 꺼져 있다. 실제 가입은 하지 않았다.
>   - 사진: 페이지에서 만든 600×400 PNG를 파일 칸에 넣었다(파일 선택 창은 열 수 없다). 가운데 400×400이 256px JPEG(4.5KB)로 올라갔다. 다시 올리면 이전 파일이 지워지고 폴더에 하나만 남는다. 방문자 첫 요청에 새 사진 주소가 들어 있다. 지우기는 경로를 비우고 파일을 지운다. 헤더 아바타는 바꾸자마자 새 사진이다. 다크 모드·좁은 폭(가로 넘침 없음).
> - 남은 확인
>   - 실제 가입(닉네임이 profiles에 들어감)과 실제 탈퇴(사진 폴더가 빔)를 지워도 되는 테스트 계정으로.
>   - 관리자 화면의 "프로필 초기화"(관리자 로그인 필요).
> - 운영 적용(2026-10-22, 사용자 요청): 17절 `20261022060000_comments_author_is_admin` → 18절 `20261022070000_profiles_and_avatars`를 파일 원문 그대로 MCP `apply_migration`으로 차례로 적용했다. 이력 버전은 적용 시각인 `20261022050012`·`20261022050038`이다(이전 마이그레이션들과 같은 방식).
>   - 적용 전: 댓글 1개(관리자), 계정 2개. 새 열·표·버킷·Storage 정책·`auth.users` 트리거는 없었다.
>   - 17절: 관리자 댓글 1/1이 `author_is_admin = true`로 채워졌다. 트리거가 있고, 트리거 함수의 anon·authenticated EXECUTE는 없다.
>   - 18절(조회만, 쓰기 없음): `profiles` 2/2(계정 수와 같음, 닉네임·사진은 모두 비어 있음), RLS 켜짐, anon은 읽기만, authenticated는 `nickname`·`avatar_path` 열만 고치고 insert·`id` 수정은 못 한다. 가입 트리거, 댓글→profiles FK, `profiles` 정책 2개, Storage 정책 3개, `avatars` 버킷(공개·1MB·JPEG)이 있다. `check_nickname`은 `ok`·`invalid`·`reserved`를 돌려준다.
>   - 구조 비교: 새 객체의 열·제약·인덱스·정책·함수·함수 권한·트리거·표 권한·열 권한·버킷 10개 범주의 해시가 개발 프로젝트와 같다.
>   - 운영 REST(anon 키): 앱과 같은 댓글 임베드 `author:profiles(nickname,avatar_path)`가 200, `rpc/check_nickname`이 200(`"reserved"`), anon의 `profiles` 수정은 401이다.
>   - 보안 어드바이저: 새 경고는 없다(전부터 있던 4개만 남았다).
> - 배포(2026-10-22, 사용자 요청): 16~18절 커밋 15개(`df11bd0`~`421a50d`)를 main에 push했다.
>   - push 전: lint·typecheck·test 통과, 운영 값으로 `npm run build` 성공(정적 131쪽, `/mypage` 동적).
>   - Vercel 배포와 GitHub 검사(`check`)가 성공했다(커밋 상태 `success`). Vercel MCP는 배포 목록·런타임 오류 조회가 403이고 CLI가 없어, 상태는 GitHub 커밋 상태로 봤다.
>   - 운영 사이트: 비로그인 `/mypage`는 `/login?from=%2Fmypage`로 307, 홈·로그인 200, 아티클 상세(`post-d167c4`)는 새 댓글 조회로 미리 만든 HTML(PRERENDER) 200, sitemap에 `/mypage`가 없다.
>   - 운영 댓글은 피드 글에 하나뿐이라(피드는 댓글 화면이 없다) 운영 화면에서 댓글 아바타·이름은 볼 수 없었다.
>   - 확인하다 본 것: `MarkdownEditor.test.tsx`가 가끔(단독 3번 중 1번) CodeMirror의 jsdom 측정 오류(`getClientRects is not a function`)로 Unhandled Error를 낸다. 테스트는 모두 통과하지만 Vitest 종료 코드가 1이라 CI가 간헐적으로 실패할 수 있다. 이번 변경과는 상관없고 따로 고친다.

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
12. (해결: 10단계) 관리자 판정 근거가 두 곳이다. 앱은 `app_metadata.is_admin` 또는 `public.users.is_admin`, RLS `is_admin()`은 `public.users`만 본다. `is_admin()`은 노출 스키마의 `SECURITY DEFINER` 함수이고, `public.users`는 관리자만 들어 있어 회원 목록으로 오해하기 쉽다.

### 동작·데이터

- (해결: 4·5단계, 방문자는 있는 다이어리면 안내 화면·없으면 404, 본문은 관리자 전용 유지) 다이어리 상세는 없는 글·다른 타입 비공개 글에도 404 대신 "비공개 다이어리"를 200으로 보인다. 공개 다이어리도 RLS(`type <> 'diary'`) 때문에 비관리자에게 안 보일 수 있다(기본 스키마 확인 필요).
- (해결: 4단계) 수정 화면(`/article|feed|diary/edit/[slug]`)에서 없는 slug는 404 대신 500이다. 로그인 후에는 수정 화면이 아니라 목록으로 돌아간다.
- 카테고리 이름 변경·삭제가 트랜잭션이 아니다. 순서 변경(upsert)이 그 사이 삭제된 카테고리를 되살릴 수 있다. 비공개 카테고리 글을 공개 카테고리로 옮기면 바로 공개된다.
- `createPost`의 카테고리 자동 생성은 이름 검증(50자, `/` 금지)을 건너뛴다.
- (해결: 4단계) 글 수정으로 카테고리·slug가 바뀌면 옛 카테고리 목록 캐시를 무효화하지 않는다. `revalidatePath(`/${type}`)`는 아티클에서 없는 경로 `/blog`를 무효화한다.
- 발행 중에도 발행 버튼이 살아 있어 두 번 발행될 수 있다(`PostEditor`가 `createPost`를 transition 밖에서 기다린다).
- (정책은 해결: 13단계 `20261022050000_comments_delete_owner.sql`) 댓글 DELETE 정책이 마이그레이션에 없고, `deleteComment`는 지운 행 수를 확인하지 않아 RLS가 막아도 성공을 돌려준다. 비공개 카테고리 글에는 관리자도 댓글을 못 쓸 수 있다.
- (해결: 5단계) 공개 목록의 댓글 수는 anon 키로 세는데 댓글 조회 정책이 로그인 사용자 전용이라 항상 0일 수 있다. 댓글 액션은 캐시를 무효화하지 않는다.
- 아티클 "전체 글" 수가 카테고리별 합계라 카테고리 없는 공개 글이 빠진다(`getPublicPostCounts`).
- 피드 댓글 화면이 없다. (해결: 5단계) 피드 카드의 좋아요 수·댓글은 하드코딩이다.
- 조회수(`view_count`)를 올리는 코드가 없다.
- (해결: 4단계) 날짜를 UTC로 표시해(`toISOString().slice(0, 10)`, 서버 `toLocaleDateString`) KST 오전에 쓴 글이 전날로 보인다. 표지 이미지 규칙도 화면마다 다르다(홈은 썸네일만, 아티클은 썸네일 → 첫 이미지, 피드는 첫 이미지).
- 다이어리 달력: 날짜 필터는 KST, 월 필터·라벨은 브라우저 시간대라 월 경계에서 어긋날 수 있다.
- (해결: 13단계) 기본 스키마(테이블·`is_admin()`·기본 RLS·Storage 버킷)가 `supabase/migrations/`에 없다.

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
