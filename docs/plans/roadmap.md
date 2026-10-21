# 로드맵

- **작성:** 2026-10-21
- **근거:** 운영 재개 준비 중 코드 검토 결과, 사용자 결정(2026-10-21: MongoDB 전환을 철회하고 Supabase를 유지, 리전 정렬·ISR 복구를 앞당김, 전체 리팩터링 진행, 도메인은 나중에 구입, 배포는 Vercel)

이전 `tasklist.md`를 대체한다. 끝난 단계는 `[x]`로 바꾸고 한 줄 결과를 남긴다.

## 진행 현황

- [x] 0. Claude 기본 세팅 — CLAUDE.md, `.env` 접근 차단, Vitest, CI(lint·typecheck·test), commit 스킬
- [ ] 1. Supabase 백업과 운영 주소 정리 (사용자 작업)
- [ ] 2. 관리자 판정 보안 수정과 인증 관문 정리
- [ ] 3. 리전 정렬
- [ ] 4. 기반 정리와 테스트 안전망
- [ ] 5. ISR 복구와 일시정지 방지
- [ ] 6. DB 타입과 쓰기 액션 정리
- [ ] 7. UI 통일과 큰 컴포넌트 분할
- [ ] 8. 본문 보안과 에디터 정리

## 진행 원칙 (2~8단계)

- 순서: 보안(2) → 체감 속도(3·5) → 코드 품질(6~8). 4단계는 5단계가 기댈 조회·무효화·공용 규칙을 먼저 모으는 선행 작업이다.
- 단계를 시작할 때 그 단계의 짧은 계획을 확인받는다. 동작이 바뀌지 않는 정리와 동작 변경(버그 수정)은 커밋을 나눈다.
- 공통화는 실제로 두 곳 이상 같은 코드만 한다. 세 글 타입의 목록 화면(그리드·카드·달력)은 구성이 달라 합치지 않는다.

## 1. Supabase 백업과 운영 주소 정리

- 2026-10-21 오전에는 `mgyoglaujbxfbuxxlcfj.supabase.co`가 DNS에서 조회되지 않았고(NXDOMAIN), 같은 날 오후에는 REST 엔드포인트가 401로 응답한다(프로젝트 활성). 대시보드에서 상태를 확인한다.
- `pg_dump`로 스키마·데이터를, Storage 버킷(`post-images-public`·`post-images-private`) 파일을 백업한다. 기본 스키마가 저장소에 없어서 덤프가 유일한 원본이다.
- 프로젝트가 활성이면 아래 보안 문제가 열린 채 운영되므로 바로 2단계를 하거나 백업 후 다시 일시정지한다.
- 도메인: `w-life.store`는 만료됐고(2026-10-21 whois 등록 가능) 나중에 새로 산다. 그때까지 Vercel 기본 주소(`*.vercel.app`)로 운영한다. Vercel 환경변수 `NEXT_PUBLIC_SITE_URL`과 Supabase Auth의 Site URL·Redirect URLs를 그 주소로 맞춘다(sitemap·robots·메타데이터·로그인 리다이렉트 기준). 도메인을 사면 같은 곳과 CLAUDE.md·README 주소를 바꾼다.
- 기한 2026-10-30: 외부 자료에 따르면 기존 무료 프로젝트도 이날부터 Data API(PostgREST) 접근에 명시적 Postgres GRANT가 필요하다. `publicPosts.ts`가 anon 키로 PostgREST를 직접 부르므로, Supabase 공지로 적용 여부를 확인하고 해당하면 GRANT를 새 마이그레이션으로 추가한다.

## 2. 관리자 판정 보안 수정과 인증 관문 정리

- 대상: 알려진 문제 보안 1~4, 9. `lib/server/admin.ts`, `middleware.ts`, 로그인 폼·`/auth/callback` 리다이렉트, 로그아웃.
- 방향: 관리자 판정은 `auth.getUser()`로 검증한 사용자의 `app_metadata.is_admin` 또는 `public.users.is_admin`만 본다. 요청 헤더·`user_metadata`는 보지 않는다. 미들웨어는 세션 갱신만 한다. 리다이렉트는 같은 출처 경로만 허용한다. 각각 회귀 테스트를 같이 쓴다.
- 관문 API 정리: 인자 없는 `getViewer()`(user·isAdmin)와 실패를 돌려주는 `assertAdmin()`(서버 액션·라우트 핸들러용)으로 나눈다. 지금은 `requireAdmin`이 액션 안에서도 redirect하고, 댓글 액션은 `"unauthorized"`를 돌려주고, 이미지 GET은 401 대신 로그인으로 보낸다. 페이지는 지금처럼 `requireAdmin`(redirect)을 쓴다.
- 미들웨어는 `proxy.ts`로 이름을 바꾸고 `sb-` 쿠키가 없으면 클라이언트를 만들지 않는다. 로그아웃은 POST 하나로 합친다.
- 테스트: 이 단계에서 Supabase 클라이언트 mock을 만들고 4단계에서 넓힌다.
- 배포 전 확인: 실제 관리자 계정의 플래그가 `app_metadata` 또는 `users` 테이블에 있는지(`user_metadata`에만 있으면 관리자도 막힌다), DB 함수 `is_admin()`이 무엇을 보는지.

## 3. 리전 정렬

- `vercel.json`이 없어 Vercel 함수가 기본 리전 `iad1`(워싱턴)에서 돈다. 대시보드에서 Supabase 리전을 확인하고(사용자), `vercel.json`의 `regions`로 함수 리전을 같은 곳(서울이면 `icn1`)에 맞춘다.
- 바꾸기 전과 후에 `/`·`/article`·상세 하나의 TTFB를 재서 5단계와 비교할 기준으로 남긴다.

## 4. 기반 정리와 테스트 안전망

- 동작이 바뀌지 않는 정리
  - `server-only`를 `lib/supabase/service.ts`·`server.ts`, `lib/server/admin.ts`·`posts.ts`에 붙인다(보안 10). `lib/supabase/env.ts`의 service role 키 읽기는 `service.ts`로 옮긴다(`env.ts`는 브라우저 클라이언트도 import한다).
  - `mapPost`·`PostRow`를 쿠키를 읽지 않는 모듈로 옮겨 `publicPosts.ts`가 `posts.ts`(cookies·headers)를 import하지 않게 한다.
  - 쓰지 않는 코드 제거: `getPostsDirectly`의 안 쓰는 인자(`category`·`limit`·`offset`), `CommentForm`, `REVALIDATE_PERIOD` export, 이미지 라우트 `uuid()` 폴백, 주석 처리된 코드, 빈 `app/feed/[slug]/`, 아티클 목록의 `coverSrcFromImageKey` 중복. `getComments`는 5단계 댓글 로딩에 쓸 수 있어 남긴다.
  - 버킷 이름, 사이트 URL 폴백(`sitemap.ts`·`robots.ts`), 글 타입 → 경로 문자열(약 50곳, `postHref(type, slug?)`)을 한 곳으로 모은다.
  - `HtmlContent`의 `"use client"`를 지우고 본문 CSS를 `ckeditor5-content.css`로 바꾼다. 홈 스켈레톤 중복을 `loading.tsx`와 합치고, 목록·홈 `loading.tsx`를 route group으로 옮겨 상세·쓰기·로그인 화면에 엉뚱한 스켈레톤이 뜨지 않게 한다.
- 테스트 안전망: 2단계의 Supabase mock을 쿼리 체인까지 넓혀 `lib/server/posts.ts`·`publicPosts.ts`·`lib/actions/*`의 현행 동작 테스트를 쓴다. 지금 테스트는 `lib/image.test.ts`·`lib/markdown.test.ts` 두 개뿐이다.
- 공용 규칙 (동작 변경, 테스트 먼저)
  - `getPostForRoute(type, slug): Post | null`(쿼리에 `.eq("type")`)로 상세·수정 6곳의 제각각인 throw 처리를 `notFound()` 한 줄로 바꾼다. 수정 화면 3곳은 `loadPostForEdit`로 묶고 로그인 `from`을 수정 경로로 한다. 다이어리 상세 200, 수정 화면 500·목록 복귀 문제가 함께 풀린다.
  - 캐시 무효화 블록(글 액션 2곳, 카테고리 액션 4곳)을 `revalidatePostCaches({ type, slug, category, prev })` 하나로 모은다. 없는 `/blog` 경로와 옛 카테고리 미무효화가 풀린다.
  - `formatPostDate`(Asia/Seoul), `coverKeyOf(post)`(썸네일 → 첫 이미지)로 날짜·표지 규칙을 통일한다.

## 5. ISR 복구와 일시정지 방지

- 조회를 "공개(쿠키 없음, 태그 캐시)"와 "관리자" 두 계열로 나눈다. 공개 페이지는 공개 계열만 쓴다. 비관리자 다이어리 목록(본문 가림)은 모든 비관리자에게 같으므로 쿠키 없이 캐시한다.
- 로그인 상태는 레이아웃의 `AuthProvider` 하나가 구독하고 `useViewer()`·`<AdminOnly>`로 읽는다. `AuthButton`·`MobileNav`의 중복 구독과 로그아웃 코드를 합친다. 서버 액션의 권한 검사는 그대로 둔다.

  | 경로 | 지금 동적인 이유 | 할 일 |
  |---|---|---|
  | `/` | 없음 | 빌드 출력으로 정적인지 확인 |
  | `/feed` | `getCurrentUser`·`isAdminDb`·쿠키 조회 | `getPublicPosts`로 교체. `FeedCard`를 서버 컴포넌트로 바꾸고 펼치기·관리자 메뉴만 클라이언트로, 더미 좋아요·댓글 제거 |
  | `/article/[slug]` | 같음 + 단건·댓글 쿠키 조회 | anon 단건 조회와 `generateStaticParams`. 수정·삭제 메뉴와 댓글을 클라이언트 말단으로, `generateMetadata` 추가 |
  | `/diary` | 같음 + 쿠키 조회 | 비관리자 조회를 쿠키 없이. `DiaryIndexClient`를 `<Suspense>`로 감싸고(`useSearchParams`) 필요한 필드만 넘김 |
  | `/diary/[slug]` | 같음 | 공개만 anon 조회, 비공개는 404 |
  | `/article` | 같음 + `searchParams`·카테고리 쿠키 조회 | 아래 결정 1 |

- 공개 fetch의 revalidate 기본값 60초를 세그먼트와 같은 86400초로 맞춘다(태그 무효화가 있다). 상세 경로와 댓글 액션도 `revalidatePostCaches`로 무효화한다.
- 착수 전에 정할 것
  1. `/article`: (a) 카테고리를 지금 리다이렉트만 하는 `/article/category/[slug]` 경로로, 페이지 번호도 경로로 옮겨 정적화한다. (b) 쿼리 문자열을 유지하고 데이터 캐시만 한다(동적 렌더링).
  2. 관리자에게 비공개 글을 공개 목록에 섞어 보일지, 관리자 전용 경로로 분리할지.
- 확인: `next build` 출력에서 위 경로가 정적·ISR로 나오는지, 배포 뒤 `x-vercel-cache: HIT`인지, 3단계 TTFB와 비교한다.
- 일시정지 방지: ISR이 살면 DB 요청이 줄어 무료 플랜의 7일 무활동 일시정지 위험이 커진다. Vercel Cron(Hobby는 하루 1회)으로 공개 조회 함수를 부르는 라우트 핸들러를 두고 `CRON_SECRET`으로 막는다.

## 6. DB 타입과 쓰기 액션 정리

- 1단계 덤프 뒤 `supabase gen types`로 `Database` 타입을 만들어 Supabase 클라이언트 3개에 붙이고, 손으로 쓴 `PostRow`와 캐스트를 지운다. `Post`에서 `mapPost`가 늘 채우는 필드는 필수로 바꾸고, `Category` 타입은 `lib/types.ts`로 옮긴다.
- 서버 액션 입력 검증을 zod로 한다(지금 zod를 쓰는 곳이 없고 `createPost`에 손으로 쓴 검증이 약 55줄 있다). `DB Error: <원문>` 응답 약 20곳을 "로그를 남기고 일반 메시지를 돌려주는" 함수 하나로 바꾼다.
- 글: `createPost`를 실제 동작대로 `savePost`(upsert)로 바꾼다. 카테고리 자동 생성과 `createCategory`를 `ensureCategory`로 합쳐 이름 검증을 같이 쓴다. slug 중복 확인은 순차 조회(최대 5회) 대신 unique 제약 위반(23505) 때 재시도한다. 수정할 때 `author_id`를 덮어쓰지 않는다.
- 카테고리: FK가 `on update cascade`라서 `updateCategory`의 posts 수동 갱신과 보상 롤백은 필요 없다(운영 DB에 FK가 있는지 덤프로 먼저 확인). 사용 중 개수는 `posts(count)`로 센다. 이름 변경·삭제·순서 변경의 트랜잭션 문제는 새 마이그레이션의 RPC로 푼다.
- 댓글: 행 매핑·select·작성 가능 판정이 세 곳에 중복돼 있어 합치고, 인증은 `getViewer()`를 쓴다.

## 7. UI 통일과 큰 컴포넌트 분할

- 기계적 통일(분할 전에)
  - 아이콘은 lucide-react 하나로(react-icons 8개 파일, 직접 그린 SVG 아이콘 7곳). 클래스 조합은 `cn`으로(`.join(" ")` 7곳).
  - `ui.tsx`에 `Button` variant를 추가하고(primary 버튼 클래스 10곳 이상 반복), 하드코딩 색(약 49곳)은 `--success`·`--warning`·`--danger` 토큰으로.
  - 내비 링크 목록을 `SiteHeader`·`MobileNav` 한 곳으로 모으고 `aria-current`를 붙인다.
- 표현 컴포넌트: `PostMeta`(작성자·날짜 줄 3곳), `PostBody`, `VisibilityIcon`(5곳), `ArticleCard`·`CategorySidebar`·`Pagination`(아티클 목록 379줄에서 분리).
- 분할
  - `PostEditor`(706줄): 임시저장 `usePostDraft`, 설정 패널 `PostSettingsPanel`. 업로드는 공개 범위를 받는 함수 하나로 CkEditor 어댑터와 합친다(보안 5와 함께). 카테고리는 클라이언트 조회 대신 서버에서 넘기고, 저장 중에는 버튼을 막는다.
  - `DiaryIndexClient`(584줄): 날짜 함수를 lib로 옮겨 테스트하며 KST로 통일한다. URL 동기화 effect를 없애고 `searchParams`에서 값을 바로 구한다. `DiaryCalendar`·`DiaryList`로 나눈다.
  - `CategorySettingsModal`(481줄): 반복되는 toast → 새로고침 흐름을 `run()` 하나로, 행은 `CategoryRow`로. ESC로 닫을 때 편집 상태를 초기화한다.
  - `CommentsThread`: 댓글·대댓글 마크업을 `CommentItem`으로, `confirm`·`alert`를 sonner로.
- framer-motion: 5단계에서 FeedCard 더미를 지우면 PostEditor 사이드바만 남는다. `<dialog>`로 바꾸고 의존성을 지운다.
- 다크 모드: `@custom-variant dark`를 넣어 `dark:`가 next-themes `.dark`를 따르게 하고 `ThemeToggle`은 `resolvedTheme`을 본다. `app/globals.css`의 미커밋 변경이 커밋된 뒤에 한다.
- 접근성: 아이콘 버튼 `aria-label`, 토글 `aria-pressed`, label·입력 연결.

## 8. 본문 보안과 에디터 정리

- 대상: 알려진 문제 보안 5~7. 본문 이미지를 글 공개 범위의 버킷에 올리고, 비공개 이미지 응답은 `Cache-Control: private`, 본문 HTML 정화와 SVG 업로드 차단.
- CkEditor: 툴바에만 있고 플러그인이 없는 항목(`code`·`codeBlock`·`htmlEmbed` 등)과 로드만 하고 툴바에 없는 플러그인(Font·Alignment·Emoji·Mention·CloudServices·Autosave)을 정리하고, GHS 전체 허용을 줄이고, `<style jsx global>`을 `globals.css`로 옮긴다. 기존 글 HTML이 쓰는 서식을 덤프에서 먼저 확인해 편집할 때 서식이 지워지지 않게 한다.

## 알려진 문제 (2026-10-21 코드 검토)

### 보안

1. **요청 헤더 위조로 관리자 우회.** `getCurrentUser`·`isAdminDb`가 클라이언트가 보낼 수 있는 요청 헤더 `x-user-id`·`x-user-is-admin`을 믿는다. 비로그인 요청으로도 글·카테고리 쓰기·삭제, 비공개 이미지 조회·업로드가 된다(쓰기는 service role이라 RLS가 막지 못한다).
2. **`user_metadata.is_admin` 신뢰.** 사용자가 스스로 바꿀 수 있는 값이라, 회원가입 후 `updateUser`로 누구나 관리자가 된다(`isAdminDb`·미들웨어).
3. 미들웨어가 사용자 id·email을 **응답** 헤더로 내보낸다. 의도한 성능 최적화는 동작하지 않는다.
4. 열린 리다이렉트: 로그인 `from`, 콜백 `next`가 `//evil.example`이면 외부로 이동한다.
5. 본문 편집기(CKEditor) 이미지는 글 공개 범위와 상관없이 공개 버킷에 올라간다. 비공개 글·다이어리 본문 이미지가 URL로 열린다.
6. 비공개 버킷 이미지 응답에도 `Cache-Control: public, max-age=31536000, immutable`을 붙인다.
7. 본문 HTML을 정화 없이 렌더링한다(`HtmlContent`). SVG 업로드도 허용한다. 관리자 판정이 뚫리면 저장형 XSS가 된다.
8. `getCategories`가 `requireAdmin` 없이 service role을 쓴다(`isAdminDb`에만 기댄다).
9. 로그아웃이 GET `/logout`이라 다른 사이트가 링크·이미지로 로그아웃시킬 수 있다. 브라우저에서 `signOut`한 뒤 GET을 또 불러 두 번 처리한다.
10. `server-only`가 `lib/server/publicPosts.ts`에만 있어 service role 클라이언트 모듈이 클라이언트 번들로 import되는 것을 빌드가 막지 못한다.

### 동작·데이터

- 다이어리 상세는 없는 글·다른 타입 비공개 글에도 404 대신 "비공개 다이어리"를 200으로 보인다. 공개 다이어리도 RLS(`type <> 'diary'`) 때문에 비관리자에게 안 보일 수 있다(기본 스키마 확인 필요).
- 수정 화면(`/article|feed|diary/edit/[slug]`)에서 없는 slug는 404 대신 500이다. 로그인 후에는 수정 화면이 아니라 목록으로 돌아간다.
- 카테고리 이름 변경·삭제가 트랜잭션이 아니다. 순서 변경(upsert)이 그 사이 삭제된 카테고리를 되살릴 수 있다. 비공개 카테고리 글을 공개 카테고리로 옮기면 바로 공개된다.
- `createPost`의 카테고리 자동 생성은 이름 검증(50자, `/` 금지)을 건너뛴다.
- 글 수정으로 카테고리·slug가 바뀌면 옛 카테고리 목록 캐시를 무효화하지 않는다. `revalidatePath(`/${type}`)`는 아티클에서 없는 경로 `/blog`를 무효화한다.
- 발행 중에도 발행 버튼이 살아 있어 두 번 발행될 수 있다(`PostEditor`가 `createPost`를 transition 밖에서 기다린다).
- 댓글 DELETE 정책이 마이그레이션에 없고, `deleteComment`는 지운 행 수를 확인하지 않아 RLS가 막아도 성공을 돌려준다. 비공개 카테고리 글에는 관리자도 댓글을 못 쓸 수 있다.
- 공개 목록의 댓글 수는 anon 키로 세는데 댓글 조회 정책이 로그인 사용자 전용이라 항상 0일 수 있다. 댓글 액션은 캐시를 무효화하지 않는다.
- 아티클 "전체 글" 수가 카테고리별 합계라 카테고리 없는 공개 글이 빠진다(`getPublicPostCounts`).
- 피드 댓글 화면이 없다. 피드 카드의 좋아요 수·댓글은 하드코딩이다.
- 조회수(`view_count`)를 올리는 코드가 없다.
- 날짜를 UTC로 표시해(`toISOString().slice(0, 10)`, 서버 `toLocaleDateString`) KST 오전에 쓴 글이 전날로 보인다. 표지 이미지 규칙도 화면마다 다르다(홈은 썸네일만, 아티클은 썸네일 → 첫 이미지, 피드는 첫 이미지).
- 다이어리 달력: 날짜 필터는 KST, 월 필터·라벨은 브라우저 시간대라 월 경계에서 어긋날 수 있다.
- 기본 스키마(테이블·`is_admin()`·기본 RLS·Storage 버킷)가 `supabase/migrations/`에 없다.

### 성능·SEO

- ISR이 사실상 꺼져 있다. 목록·상세가 `getCurrentUser`(`headers()`)를 읽어 매 요청 동적 렌더링된다. 상세 경로는 `revalidatePath`도 하지 않는다.
- 공개 fetch의 revalidate 기본값이 60초라 세그먼트의 86400초와 어긋난다.
- 공개 본문(`HtmlContent`)이 편집기 전체 CSS(`ckeditor5.css`, 약 433KB)를 불러오고, `"use client"`라 본문 HTML이 RSC 페이로드에 한 번 더 실린다.
- 관리자 아티클 목록·피드·다이어리 목록은 본문까지 전부 읽는다(페이지네이션 없음).
- 상세 페이지에 `generateMetadata`가 없어 글 제목이 `<title>`·OG에 안 들어간다.
- sitemap은 공개 아티클 1000개에서 잘리고, 60초마다 다시 만들어질 수 있다. 본문(`content`)까지 읽는다.

### 기타

- 헤더·모바일 메뉴의 검색 입력이 동작하지 않는다. `BackButton`은 뒤로 가지 않고 항상 `fallbackHref`로 이동한다.
- Next 16에서 `middleware.ts` 이름이 폐기 예정이다(빌드 경고, `proxy.ts`로 변경).
- 아티클 목록 페이지에 `coverSrcFromImageKey` 중복 구현이 있다. `CommentForm`·`getComments`는 쓰는 곳이 없다.
- 오류 응답에 `DB Error: <원문>`을 그대로 돌려준다.
- `globals.css`에 `@custom-variant dark`가 없어 `dark:` 유틸리티는 OS 설정을, 색 토큰은 next-themes의 `.dark`를 따른다. `ThemeToggle`은 `theme`을 봐서 시스템 테마일 때 첫 클릭에 바뀌지 않을 수 있다.
- 목록·홈 `loading.tsx`가 하위 경로에도 적용돼 상세·쓰기·로그인 화면에 엉뚱한 스켈레톤(목록·홈)이 뜬다.
