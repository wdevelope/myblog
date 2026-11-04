# 로드맵

- **작성:** 2026-10-21
- **근거:** 운영 재개 준비 중 코드 검토 결과, 사용자 결정(2026-10-21: MongoDB 전환을 철회하고 Supabase를 유지, 리전 정렬·ISR 복구를 앞당김, 전체 리팩터링 진행, 도메인은 나중에 구입, 배포는 Vercel)

이전 `tasklist.md`를 대체한다. 끝난 단계는 `[x]`로 바꾸고 한 줄 결과를 남긴다.

## 진행 현황

- [x] 0. Claude 기본 세팅 — CLAUDE.md, `.env` 접근 차단, Vitest, CI(lint·typecheck·test), commit 스킬
- [ ] 1. Supabase 백업과 운영 주소 정리 (사용자 작업) — 운영 주소는 정리됐고, 백업은 나중에 하기로 했다(2026-11-04)
- [x] 2. 관리자 판정 보안 수정과 인증 관문 정리 — `getViewer`·`assertAdmin`, `proxy.ts`, 같은 출처 리다이렉트, GET `/logout` 제거, 회귀 테스트 38개(2026-10-21). 배포 전 확인 완료, 그 과정에서 찾은 보안 11은 마이그레이션으로 막음(2026-10-22, 2절)
- [x] 3. 리전 정렬 — 함수 리전 `icn1` 고정, 운영 동적 응답의 `x-vercel-id`가 `icn1::icn1`(2026-11-04, 3절)
- [x] 4. 기반 정리와 테스트 안전망 — `getPostForRoute`·`loadPostForEdit`, `revalidatePublicPosts`, `formatPostDate`(KST)·`coverKeyOf`, `postHref`·`SITE_URL`, 로딩 route group, 행 매핑 분리(2026-10-22, 테스트 파일 15개·82개)
- [x] 5. ISR 복구와 일시정지 방지 — 공개 화면 전부 정적·ISR(`next start`에서 HIT, TTFB 2~5ms), 관리자는 draft mode, `/article` 경로 기반, 댓글 공개, 일시정지 방지 Cron(2026-10-22). 배포 뒤 확인과 `CRON_SECRET` 설정이 남았다(5절)
- [ ] 6. DB 타입과 쓰기 액션 정리
- [x] 7. UI 통일과 큰 컴포넌트 분할 — 아이콘·버튼·색 토큰·내비 통일, `PostEditor`·`DiaryIndexClient`·`CommentsThread` 분할, framer-motion·react-icons 제거, 다크 모드·접근성, 발행 중복 저장과 다이어리 시간대 수정(2026-11-05, 7절). 운영 환경값으로 빌드 끝까지 돌리기와 실제 발행·삭제 확인이 남았다
- [x] 8. 에디터 교체와 본문 보안 (CKEditor → 마크다운) — 마크다운 렌더러·원문 편집 에디터, 기존 글 135개 변환, 비공개 이미지 `private, no-store`·SVG 차단, CKEditor 제거(2026-10-22)
- [x] 9. 요청 왕복 줄이기 — `proxy.ts`를 `getClaims()`로(로그인 요청의 proxy 27~49ms → 1.5~3ms), 상세 댓글 조회의 글 재조회 제거. 아티클 목록 병렬화는 5단계로 넘김(2026-10-22, 9절)
- [x] 10. 관리자 판정 단일화와 `public.users` 정리 — RLS `is_admin()`·`getViewer` 모두 `app_metadata.is_admin`, `public.users` 삭제(운영 DB 적용, 2026-10-22, 10절)
- [x] 11. 관리자 화면을 직접 켜고 끄기 — 1~4 구현·운영 배포, 관리자 로그인 상태 브라우저 확인(2026-10-22). 토글은 21절에서 없앴다. 꺼진 관리자 상태가 없어져 캐시 측정은 필요 없고, 로그아웃 확인은 21절로 넘겼다(2026-11-04, 11절)
- [x] 12. 에디터 라이브 프리뷰 — 미리보기 패널을 없애고 작성 칸에 바로 서식을 보인다(CodeMirror 6). 1~4 구현(2026-10-22). 실제 Chrome에 입력기 조합 신호를 보내 한글 21개 경우와 이미지 붙여넣기·끌어놓기를 확인했다(저장소 밖 일회성 검증, 2026-11-04). 개발 서버 글쓰기 화면에서 입력·이미지 붙여넣기 업로드·저장도 확인했고, 10월 23일 이후 운영 다이어리 2개(3,173자)에 깨진 한글이 없다. 도구 입력은 macOS 입력기를 거치지 않고, iOS 실기기는 확인하지 못했다(2026-11-04, 12절)
- [x] 13. 개발 DB 분리 — 개발 프로젝트 `myblog-dev` 생성, 빠진 기준 마이그레이션 3개 복원, 운영과 구조 일치(카탈로그 18개 범주 해시 동일), 가짜 데이터 seed(2026-10-22). `.env.development.local`을 넣어 개발 서버가 개발 프로젝트를 쓴다(anon·service role 요청 200 확인, 2026-10-22). 관리자 계정 지정, seed 글 작성자와 댓글 채움. 개발 서버의 글·이미지 쓰기가 개발 프로젝트에만 생기고 운영 수는 그대로인 것을 확인했다. Auth 설정(Site URL·Redirect URL `http://localhost:2025`, 이메일 확인 끔) 완료. 공개 글·댓글 쓰기도 개발 프로젝트에만 생긴다. 개발 서버 안전장치 구현(2026-11-04, 13절 6)
- [x] 14. 관리자 로그인 때 관리자 화면 켜기와 켠 상태의 속도 — 로그인 때 켜기 구현·브라우저 확인(개발 DB), 켠 상태의 속도 개선은 하지 않기로 함(2026-10-22, 14절)
- [x] 15. 에디터 이미지 크기·정렬·삭제 툴바 — 1~4 구현, 로그인 없는 임시 화면으로 실제 브라우저 확인(2026-10-22). 개발 서버에서 실제 저장 뒤 상세의 폭·정렬을 데스크톱·모바일로 확인했다(2026-11-04, 15절)
- [x] 16. 글을 쓴 직후 방문자의 첫 요청이 이전 목록을 받는 문제 — 태그를 `updateTag`로 바로 만료하고, 효과가 없던 목록 `revalidatePath`를 주소로 고쳤다. 개발 서버에서 저장 직후 첫 요청에 새 글이 보이는 것을 확인했다(2026-10-22). 에디터 저장으로 다시 확인했고 목록 3곳 모두 첫 요청에 새 제목이 보였다(개발 서버, 2026-11-04). 운영에서는 비공개 다이어리를 저장하자 쿠키 없는 첫 요청이 `REVALIDATED`로 새 글을 보여 줬고(114 → 115개), 삭제 뒤 첫 요청에서 원래 목록으로 돌아왔다. 운영 아티클 목록은 재보지 않았다(2026-11-04, 16절)
- [x] 17. 마이페이지와 프로필 사진 — 1~4 구현, 개발·운영 DB 마이그레이션, 일반 계정 브라우저 확인, 운영 배포(2026-10-22). 실제 탈퇴 확인은 테스트로 대체했다: 탈퇴 액션·관리자 마이페이지 테스트, 개발 DB 롤백 확인(사용자 결정, 2026-11-04, 17절)
- [x] 18. 닉네임과 프로필 사진 바꾸기 — 1~7 구현, 개발·운영 DB 마이그레이션과 확인, 일반 계정 브라우저 확인, 운영 배포(2026-10-22). 실제 가입·탈퇴, 관리자 되돌리기의 운영 확인은 테스트로 대체했다: 가입 폼·탈퇴·되돌리기 액션 테스트, 개발 DB에서 가입 트리거의 닉네임 저장 롤백 확인(사용자 결정, 2026-11-04, 18절)
- [x] 19. 비공개 글 노출 점검 후속 — 점검(RLS·앱·Storage·캐시)에서 찾은 두 곳을 고친다. `increment_post_view` 권한 회수(개발·운영 DB 적용), 저장 때 글 공개 범위에 맞는 버킷으로 이미지 옮기기 구현과 개발 서버 확인, 운영 배포, 운영 `post-3ba694` 다시 저장으로 공개 주소 7개 닫힘 확인, 운영 테스트 글과 쓰지 않는 공개 이미지 20개 정리(2026-10-22, 19절)
- [ ] 20. 검색·조회수·이미지 자동 정리·RSS·댓글 메일 알림·방명록 — 모두 구현·커밋, 방명록 마이그레이션 개발·운영 DB 적용, 개발 서버 확인, 운영 배포·확인(2026-10-22). 글을 지울 때 Storage 파일이 지워지는 것은 개발 서버에서 확인했다(2026-11-04). 방명록 로그인 흐름, 운영 조회수 증가, 댓글·방명록 알림 메일(가입 메일과 별개)의 실제 발송이 남았다(20절)
- [x] 21. 관리자 화면 토글 없애기 — 관리자 세션이 있으면 늘 관리자 화면. 관리자 쿠키를 지운 상태에서 비공개 다이어리를 열면 저절로 켜지는 것을 개발 서버 브라우저로 확인했다. 로그아웃은 모든 기기 세션을 끊어 누르지 않고 버튼 테스트로 대체했다(2026-11-04, 21절)
- [x] 22. 작성 칸 인라인 서식 기호 항상 숨기기 — 커서 줄에서도 `*`·`**` 등을 숨김, 임시 화면으로 브라우저 확인(2026-10-29, 22절)
- [ ] 23. 관리자 페이지 이동 속도 개선 — 1차 구현(다이어리 목록 본문 제거, 아티클 목록은 해당 쪽 본문만, 상세 글·댓글 한 번에 조회), 개발 DB 전후 측정, 운영 배포와 구간별 측정(2026-11-04). 목록 스켈레톤 대기를 없애 운영 목록 클릭이 약 460~510ms에서 약 250ms가 됐다(2026-11-05). 홈의 스켈레톤 대기도 없앴다(커밋·배포 전). proxy 왕복을 어떻게 할지 남았다(23절).

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

> **결과** (2026-11-04): 운영 주소의 동적 응답(`/search?q=a`, `/api/cron/keep-alive`)에서 `x-vercel-id`가 `icn1::icn1`이다. 운영 TTFB는 23절 측정값을 기준으로 쓴다. vercel.app 주소로는 재지 않았다.

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
- 알려진 한계: (목록 `loading.tsx`는 23절에서 지웠다) `(list)`의 `loading.tsx` 스트리밍 때문에 목록 경로 안의 `notFound()`는 200 + `noindex` 404 화면(soft 404), `permanentRedirect()`는 meta refresh가 된다. 다이어리 목록은 `useSearchParams` 때문에 정적 HTML에 스켈레톤만 있고 브라우저에서 그린다.
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

### 실행 계획 (2026-11-04, 사용자 확인)

위 목록을 지금 코드와 대조했다. 위 숫자는 10월 기준이고, 지금 숫자는 아래와 같다.

- 끝난 것: `CategorySettingsModal` 분할, 업로드 함수 통합(`uploadFiles` 하나), `ArticleCard`(`ArticleListItem`으로 분리, 아티클 목록은 229줄). `PostBody`는 `MarkdownContent`가 맡고 있어 만들지 않는다.
- 남은 것: 나머지 전부. `react-icons` 11개 파일, 직접 그린 SVG 아이콘 8개(6개 파일), `.join(" ")` 16곳, primary 버튼 클래스 18곳(13개 파일), 하드코딩 색 41줄(17개 파일), `PostEditor` 671줄, `DiaryIndexClient` 582줄, `aria-current`·`aria-pressed` 0곳.
- 코드에서 새로 찾은 문제(코드를 읽어 찾았고, 구현 때 테스트나 브라우저로 재현한다)
  - 발행 버튼이 저장을 기다리는 동안 막히지 않아, 두 번 누르면 새 글이 두 개 저장될 수 있다.
  - `dark:`가 사이트 테마가 아니라 OS 설정을 따른다. 시스템 테마가 어두울 때 테마 버튼의 첫 클릭은 화면을 바꾸지 않는다.
  - 다이어리 달력·목록이 한국 시간과 브라우저 시간을 섞어 써서, 한국 밖에서는 날짜가 어긋날 수 있다.
  - 밝은 모드에서 달력의 글 있는 날짜(`text-emerald-300`)가 잘 보이지 않는다.
- 위 목록과 달리 하는 것(사용자 확인)
  1. framer-motion: 위 전제와 달리 `FeedCard`가 아직 쓴다(좋아요·저장 버튼의 눌림 효과, 저장 문구). 가짜 좋아요 수를 지울 때 버튼은 남겼으므로 버튼은 두고 효과만 CSS로 옮긴다.
  2. `confirm`은 그대로 두고 `alert`만 sonner로 옮긴다. 토스트는 저절로 사라져 되돌릴 수 없는 삭제의 확인에 맞지 않고, `confirm`이 7개 파일 9곳에 있어 댓글만 바꾸면 화면마다 달라진다. `alert`는 댓글·방명록·마이페이지 5곳을 모두 옮긴다.
  3. 표현 컴포넌트는 `VisibilityIcon`(14곳)과 `PostMeta`(상세 2곳)만 만든다. `CategorySidebar`는 쓰는 곳이 하나이고, `Pagination`은 아티클이 링크, 다이어리가 버튼이라 진행 원칙("두 곳 이상 같은 코드만")에 맞지 않는다. 페이지 버튼 클래스만 `Button` variant로 함께 쓴다.
- 순서와 커밋 단위(한 줄이 한 커밋)
  - 동작 불변(기존 테스트로 지킨다)
    0. `refactor(editor)`: `MarkdownEditor`의 `uploadImages`를 쓰기 전에 선언해 lint 오류 없애기
    1. `refactor(ui)`: `.join(" ")`을 `cn`으로
    2. `refactor(ui)`: 아이콘을 lucide-react로, `VisibilityIcon`, `react-icons` 제거. 아이콘 모양은 거의 같고 `⌕`·`💬` 같은 문자도 아이콘으로 바뀐다
    3. `refactor(ui)`: `Button`·`buttonClass` variant
    4. `refactor(nav)`: 내비 링크 목록을 한 곳으로
    5. `refactor(editor)`: `usePostDraft` 분리(`defaultTitle`, 기본 제목만 있으면 임시저장하지 않는 처리 유지)
    6. `refactor(editor)`: `PostSettingsPanel` 분리, 주석 처리된 코드 제거
    7. `refactor(diary)`: 날짜 함수를 lib로, `DiaryCalendar`·`DiaryList` 분리
    8. `refactor(comments)`: `CommentItem`
    9. `refactor(post)`: `PostMeta`
  - 동작 변경(로직은 재현 테스트를 먼저 쓴다)
    10. `fix(editor)`: 저장 중 발행 버튼 막기
    11. `refactor(editor)`: 카테고리를 서버에서 넘기기
    12. `fix(diary)`: 달력·목록 날짜를 KST로 통일
    13. `refactor(diary)`: URL 동기화 effect를 없애고 `searchParams`에서 값 구하기. 처음 연 주소에 `?year=&month=`가 자동으로 붙지 않게 된다
    14. `fix(ui)`: `alert`를 sonner로
    15. `chore(deps)`: framer-motion 제거. 설정 패널은 `<dialog>`(ESC로 닫힘, 키보드 포커스가 패널 안에 머문다), `FeedCard`는 CSS
    16. `fix(theme)`: `@custom-variant dark`, `resolvedTheme`
    17. `style(ui)`: `--success`·`--warning`·`--danger` 토큰. 밝은·어두운 모드 값을 따로 두고 글자 대비를 맞추므로 일부 색이 조금 달라진다. `ThemeToggle`의 해·달 색은 상태 색이 아니라 그대로 둔다
    18. `fix(a11y)`: `aria-label`·`aria-pressed`·`aria-current`, label과 입력 연결, 포커스 표시
    19. `docs`: 로드맵 결과와 CLAUDE.md 구조 설명
- 확인: 커밋마다 `npm run lint && npm run typecheck && npm test`. 화면은 데스크톱·모바일·다크 모드를 개발 서버에서 본다. 로그인이 필요한 에디터는 커밋하지 않는 임시 화면으로 본다.

### 결과 (2026-11-05)

- 크기: `PostEditor` 671줄 → 290줄(`usePostDraft` 121줄, `PostSettingsPanel` 281줄), `DiaryIndexClient` 582줄 → 163줄(`DiaryCalendar` 149줄, `DiaryList` 147줄, 날짜는 `lib/diaryCalendar.ts`). `CommentsThread`는 `CommentItem`으로 합쳤지만 삭제 버튼을 함수로 뺀 몫이 있어 295줄이다.
- 의존성: `react-icons`·`framer-motion`을 지웠다.
- 테스트로 재현하고 고친 것: 발행 두 번 누르면 두 번 저장(`createPost` 2회 호출), 다이어리 시간대(오클랜드에서 11월 1일 칸이 10월 31일, 로스앤젤레스에서 목록 날짜가 하루 앞), 시스템 테마가 어두울 때 테마 버튼 첫 클릭이 바뀌지 않음.
- 계획과 달라진 점
  - `VisibilityIcon`은 글·카테고리 공개 범위를 뜻하는 6개 파일에만 쓴다. 방명록 비밀글 자물쇠와 에디터의 공개·비공개 선택 버튼은 공개 범위 표시가 아니라 `Lock`·`Globe`를 그대로 쓴다.
  - 피드 좋아요 하트 색도 상태 색이 아니라 `ThemeToggle`처럼 하드코딩으로 남겼다.
  - 단색 버튼 글자는 `text-white` 대신 `text-background`다. 어두운 모드 토큰이 밝아 흰 글자의 대비가 나오지 않는다.
  - 다이어리 탭 저장 키를 `diary_view` 하나로 합쳤다. 주소에 달이 없을 때만 이 값을 읽는다.
- 브라우저 확인(개발 서버, 패널에 남아 있던 관리자 세션): 데스크톱 1280px·모바일 375px, 밝은·어두운 모드에서 다이어리 달력·날짜 선택(주소만 바뀌고 서버 요청 없음), 글 설정 패널 열기·ESC·배경 클릭, 피드 좋아요·저장 문구, 모바일 메뉴 `aria-current`, 카테고리 창, 마이페이지, 아티클 상세, 방명록을 봤고 콘솔 오류는 없다. 임시 화면은 쓰지 않았다. 쿠키 없는 요청으로 주요 경로 응답과 비공개 카테고리·관리 버튼이 없는 것을 확인했다.
- 남은 확인
  - `npm run build`: 컴파일과 타입 검사는 통과했고, 이 worktree에 운영 환경값이 없어 페이지 데이터 수집에서 `Missing env var: NEXT_PUBLIC_SUPABASE_URL`로 멈췄다.
  - 실제 발행·삭제는 개발 DB에도 누르지 않았다. 발행 버튼 막기는 컴포넌트 테스트로만 확인했다.
  - 움직임 줄이기 설정의 피드 저장 문구, 로그아웃 상태의 로그인 화면은 브라우저로 보지 못했다.

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

> **결과** (2026-10-22): 결정 2 (a) 가짜 데이터 seed, 결정 3 (a) MCP `apply_migration`. 개발 프로젝트 쪽 1~5는 했지만 개발 서버는 아직 운영 사용 중이고, 위 확인은 하지 않았다(아래 점검).
> - 1: `myblog-dev`(ref `admadefdkybuvklpezht`, 서울, 월 0원)를 만들었다. 서명 키는 운영과 같은 ES256이다. Auth 설정(Site URL·이메일 확인)은 대시보드에서 사용자가 바꾼다(지금은 가입 허용·이메일 확인 켜짐).
> - 2: `20251228143413_init_schema`·`20251228143554_init_storage_buckets`·`20251230144431_create_categories_table`을 운영 이력 원문 그대로 추가했다(md5 일치).
> - 3: 마이그레이션 15개를 파일 순서대로 개발 프로젝트에 적용했고 모두 오류 없이 끝났다. 운영과 개발의 카탈로그(테이블·열·제약·인덱스·정책·함수·함수 권한·트리거·테이블 권한·버킷·확장·스키마 권한·기본 권한)를 범주별 해시로 비교해, 운영에만 있던 정책 `comments_delete_owner`(대시보드에서 만든 것)를 `20261022050000_comments_delete_owner.sql`로 옮겨 개발에만 적용했다. 그 뒤 13개 범주 모두 해시가 같다. 운영에는 같은 정책이 이미 있어 이 파일은 적용하지 않았다(운영 이력에 없다).
> - 4: `supabase/seed.sql`을 개발 프로젝트에 넣었다(카테고리 3, 아티클 공개 4·비공개 1, 피드 2, 다이어리 비공개 2·공개 1). 비로그인 REST로 공개 글 4개·공개 카테고리 2개만 보이는 것을 확인했다. 테스트 계정이 아직 없어 댓글은 비어 있다.
> - 5: CLAUDE.md(금지선의 MCP 대상 구분, 작업 방식의 DB 구조 변경 순서), README(환경 파일 두 개, 개발 DB 절), `.env.example`을 고쳤다.
> - 점검(2026-10-22, 사용자 요청): 개발 서버는 아직 운영 DB·Storage·Auth를 쓴다. 확인 미완.
>   - `.env.development.local`이 없다(저장소 루트에 `.env`·`.env.example`만 있다). 그래서 `npm run dev`가 `.env`의 운영 값으로 뜬다.
>   - 그 사이 개발 서버에서 올린 이미지 5개(12절 사용자 확인, 12:07~12:21)가 운영 `post-images-public`에 들어갔다. 어느 글도 쓰지 않는다. 지울지는 사용자가 정한다. build·start용 캐시(`.next/cache/fetch-cache`)에는 운영 프로젝트 응답이 31개, 개발은 0개였다.
>   - 개발 프로젝트는 Auth 사용자가 0명이라 로그인할 수 없다. 글 10개는 작성자가 없고, 댓글·Storage 파일은 0개다. Auth는 가입 허용·이메일 확인 켜짐 그대로다.
>   - 구조는 문제없다. 위 13개 범주에 RLS 켜짐·확장 버전·퍼블리케이션·타입·뷰·시퀀스를 더한 18개 범주 해시가 운영과 같다. 마이그레이션 SQL 원문의 차이는 끝 줄바꿈과 주석뿐이다. 운영에 seed 흔적은 없다.
>   - 전환 때 주의: 방문자 다이어리 목록의 `unstable_cache` 키(`public-diary-index`)에 Supabase 주소가 없다. 개발 서버(Next 16)는 데이터 캐시를 `.next/dev/cache/fetch-cache`에서 읽는다(`.next/cache/fetch-cache`는 build·start용이다). 그래서 이 항목을 지우거나 강력 새로고침(`cache-control: no-cache`)으로 다시 받기 전까지 운영 목록이 최대 하루 보인다. 다른 공개 조회는 캐시 키에 주소가 들어가 상관없다.
> - 전환(2026-10-22): 사용자가 `.env.development.local`을 만들었고, 개발 서버를 다시 켰다.
>   - 이때 지운 캐시는 build·start용 `.next/cache/fetch-cache`라 개발 서버와는 상관없었다.
>   - 개발 서버 캐시(`.next/dev/cache/fetch-cache`)의 다이어리 목록 항목은 12:43에 `cache-control: no-cache` 요청으로 개발 데이터(seed 3개)로 바뀌었다.
>   - 같은 캐시에 운영 공개 응답 20개가 남아 있지만, 키에 운영 주소가 들어 있어 쓰이지 않는다.
>   - 처음에는 anon 키가 운영 키라 개발 프로젝트가 모든 요청을 401로 거절했다. 개발 프로젝트 API 로그의 키 발급 시각이 운영 프로젝트를 만든 시각과 같았다.
>   - 개발 키로 바꾼 뒤에는 anon·service role 요청이 모두 200이다(로그의 키 발급 시각이 개발 프로젝트를 만든 시각과 같다).
>   - 개발 서버 화면에는 seed 글만 보인다: 아티클 공개 2개, 피드 2개, 다이어리 3개. 방문자 다이어리 목록에 비공개 제목·본문은 없다.
>   - 계정: 사용자가 개발 프로젝트에 본인 계정 1개를 만들었다(이메일 확인됨). `raw_app_meta_data`에 `is_admin: true`를 넣었고, seed 글 10개의 작성자를 이 계정으로 채웠다.
>     - 관리자 판정은 다시 로그인해야 토큰에 반영된다.
>     - 일반 계정: 사용자가 정한 계정 1개(이메일 확인됨)로 seed 댓글을 넣었다(`post-dev001`에 댓글 2·대댓글 1, 대댓글은 관리자). 개발 서버 상세 화면에 세 개 모두 보인다.
>     - seed.sql은 먼저 만든 일반 계정을 고른다. 이번에는 이메일 확인이 안 된 계정이 하나 더 먼저 만들어져 있어서, seed의 댓글 부분만 일반 계정을 지정해 실행했다.
> - 남은 일
>   1. 아래 6(개발 서버 안전장치). 계획만 썼고 확인을 기다린다.
> - Auth 설정(2026-10-22): 사용자가 개발 대시보드에서 Site URL을 `http://localhost:2025`로, Redirect URL을 `http://localhost:2025/**`로 바꾸고 이메일 확인을 껐다. `/auth/v1/settings`에서 `mailer_autoconfirm: true`를 확인했다. Site URL은 API로 보이지 않아 스크린샷으로 확인했다.
> - 쓰기 확인(2026-10-22, 사용자가 개발 서버에서 관리자로 다시 로그인해 글과 이미지를 올림)
>   - 개발 프로젝트
>     - 관리자 로그인 12:53.
>     - 비공개 아티클 1개(12:53, 작성자 관리자). 글은 10 → 11개다.
>     - 이미지 2개: 비공개 버킷 1개(12:53, 그 글 본문에서 쓴다), 공개 버킷 1개(12:48, 어느 글도 쓰지 않는다).
>   - 운영 프로젝트(읽기 전용 조회)
>     - 12:22 이후 새로 만들거나 고친 글·Storage 파일이 없다.
>     - 글 170·댓글 1·계정 2·카테고리 7개로 점검 때와 같다. 마지막 로그인도 11:21 그대로다.
>     - Storage는 33개다(오늘 전 28 + 오늘 12:07~12:21:43 테스트 이미지 5).
>   - 이어서 사용자가 공개 글과 댓글을 썼다(13:00~13:02).
>     - 개발 프로젝트: 공개 아티클 2개가 생겼다(공개 카테고리 1, 비공개 카테고리 1, 글 11 → 13개). 댓글 3개도 생겼다: 비공개 글에 관리자 댓글과 대댓글, `post-dev002`에 일반 계정 댓글.
>     - 운영 프로젝트: 수와 마지막 로그인이 그대로다(13:02 조회).
>     - 방문자 화면(쿠키 없이 요청)
>       - 비공개 카테고리의 공개 글과 비공개 글은 상세가 404다.
>       - 공개 글 상세와 일반 계정 댓글은 보인다.
>       - 새 공개 글은 첫 `/article` 요청에서 목록에 없었고, 다시 받은 뒤에 보였다. `revalidatePublicPosts`의 `revalidateTag(tag, "default")`가 stale-while-revalidate라서다(Next 16, `server/web/spec-extension/revalidate.js`). 개발 DB 분리와는 상관없는 동작이라 따로 본다.

**6. 개발 서버 안전장치 (계획, 2026-10-22 점검 뒤 사용자 요청)**

- 근거: 환경 파일 하나가 빠지면 `next dev`가 아무 경고 없이 운영 DB·Storage·Auth에 붙는다. 앱은 `NEXT_PUBLIC_SUPABASE_URL`만 본다(`lib/supabase/env.ts`). 이번에 그렇게 운영 Storage에 테스트 이미지가 쌓였다.
- 방향: 개발 서버가 운영 프로젝트 주소로 뜨려 하면 시작하지 않고, 이유와 고칠 방법을 출력한다.
  - 시점: `next.config.ts`를 phase 함수로 바꾸고 `PHASE_DEVELOPMENT_SERVER`일 때만 판정한다. Next는 환경 파일(`.env.development.local` 포함)을 읽은 뒤 설정을 불러온다(`next@16.4.2` `server/config.js`). 그래서 그때의 `NEXT_PUBLIC_SUPABASE_URL`이 개발 서버가 쓸 값이다. `next build`·`next start`·Vercel은 판정하지 않는다.
  - 판정: 주소의 호스트가 운영 프로젝트(`mgyoglaujbxfbuxxlcfj.supabase.co`)면 막는다. 주소가 없으면 판정하지 않는다(지금처럼 `getSupabaseEnv`가 막는다).
  - 위치: 판정은 순수 함수로 `lib/supabase/devGuard.ts`에 둔다. 브라우저 번들에 실리는 `env.ts`와 나누기 위해서다. `next.config.ts`는 이 파일을 상대 경로로 불러온다.
  - 메시지(한국어): 개발 서버가 운영 Supabase(`myblog`)에 붙으려 한다는 것과, `.env.development.local`에 개발 프로젝트(`myblog-dev`) 값을 넣으라는 안내(README 개발 DB 절).

**변경(커밋 단위)**

1. `lib/supabase/devGuard.ts`와 `devGuard.test.ts`: 운영 주소면 throw하고, 개발 주소·다른 주소·끝 슬래시·주소 없음은 통과한다.
2. `next.config.ts`: phase 함수로 바꿔 개발 서버에서만 판정을 부른다. 이미지 원격 패턴은 그대로 둔다.
3. 문서: README 개발 DB 절과 CLAUDE.md 구조 절에 한 줄씩, 로드맵 진행 현황과 이 절의 결과.

**착수 전에 정할 것**

1. 일부러 운영에 붙여 개발 서버를 띄울 길
   - (a) 두지 않는다(권장). 운영 데이터로 확인할 때는 `npm run build` 뒤 `.claude/launch.json`의 `prod`(`next start --port 2026`)를 쓴다.
   - (b) 우회 변수를 둔다(예: `ALLOW_PROD_SUPABASE_IN_DEV=1`). 편하지만 셸에 남으면 다시 조용히 운영에 붙는다.
2. 넣는 순서
   - (a) 사용자가 `.env.development.local`을 만든 직후에 넣는다(권장). 개발 서버가 끊기지 않는다.
   - (b) 먼저 넣는다. 환경 파일을 만들 때까지 `npm run dev`가 뜨지 않지만, 그 사이 운영에 쓰는 것(15절 이미지 업로드 확인 등)은 바로 막힌다.

**확인**

- `npm run lint && npm run typecheck && npm test`.
- `.env*`는 건드리지 않고 셸 변수로 확인한다. 셸 변수가 환경 파일보다 앞선다. `NEXT_PUBLIC_SUPABASE_URL`을 운영 주소로 주고 `npm run dev`를 띄우면 메시지와 함께 멈추고, 개발 주소로 주면 뜬다. `npm run build`는 운영 값으로 그대로 통과한다.

**하지 않는 것**: 개발 프로젝트 주소만 허용하기(개발 프로젝트를 다시 만들면 코드도 고쳐야 한다), `scripts/convert-html-to-markdown.mjs`에 판정 넣기(일회성 변환이고 `.env.local`·`.env`만 읽는다), 다이어리 목록 캐시 키에 주소 넣기(전환 때 캐시를 한 번 지우면 된다), 요청마다 판정하기(시작할 때 한 번이면 된다).

> **결과** (2026-11-04): 6 구현. 착수 전 결정은 둘 다 권장안 (a)로 했다(우회 변수 없음, `.env.development.local`이 이미 있다). `lib/supabase/devGuard.ts`와 테스트 4개, `next.config.ts` phase 함수. 셸 변수로 운영 주소를 주고 `next dev`를 띄우면 안내 문구와 함께 종료 코드 1로 멈추고 포트가 열리지 않는다. 개발 주소로는 정상으로 뜬다.

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

> **결과** (2026-10-22): 1 구현(`35808dc`, 테스트 3개). 2는 하지 않기로 했다.
> - 브라우저(`next dev`, 개발 DB, 관리자 계정, 로그인은 사용자가 했다): 로그인 직후 `POST /api/admin-mode` 204가 나가고, 이동한 화면이 바로 관리자 화면이다. 메뉴 버튼이 "메뉴 열기(관리자 화면 켜짐)"이고, `/article`에 "아티클 쓰기"와 비공개 글을 포함한 5개가 나온다.

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

## 19. 비공개 글 노출 점검 후속 (함수 권한·이미지 버킷)

- 근거(2026-10-22, 사용자 요청 점검)
  - 비공개 글의 본문·제목·댓글은 RLS와 앱이 함께 막는다. 개발 DB에서 anon과 일반 사용자 역할(`user_metadata.is_admin=true`를 넣은 경우 포함)로 조회하면 비공개 글·다이어리·비공개 카테고리 글·그 댓글·비공개 버킷 파일이 0건이다. 쿠키 없는 요청으로는 상세가 404이고, 목록·홈·피드·sitemap에 slug가 없다.
  - 고칠 곳은 둘이다(알려진 문제 보안 13·14).
  1. `increment_post_view(p_slug)`는 `security definer`인데 anon·authenticated가 `/rest/v1/rpc/increment_post_view`로 부른다.
     - 원인: 마이그레이션의 `revoke all ... from public`은 Supabase가 두 역할에 따로 준 기본 권한을 지우지 못한다.
     - 영향: 누구나 비공개 글·다이어리의 조회수를 바꾸고, 돌려받는 값(0 또는 1 이상)으로 그 slug의 글이 있는지 안다. 본문·제목은 새지 않는다.
     - `search_path`도 없다. 보안 어드바이저 경고 3개(anon 실행, authenticated 실행, search_path)가 이 함수에서 나온다. 앱은 이 함수를 쓰지 않는다.
  2. 비공개 글의 이미지가 공개 버킷에 남는다.
     - 원인: 버킷은 올리는 순간 에디터의 공개 범위로 정해지고(`PostEditor` → `/api/images` POST), `createPost`는 저장할 때 키를 보지 않는다. 공개로 쓰다 비공개로 바꾸면 이미지는 공개 버킷 주소로 계속 열린다.
     - 운영 1건: `post-3ba694`(비공개 아티클). 2026-01-03에 올린 파일 7개(본문 6, 썸네일 1)가 모두 공개 버킷에 있다. 버킷 목록 정책이 없어 주소를 모르면 찾을 수 없지만, 공개였던 동안 주소가 바깥에 남았을 수 있다.
     - 반대 방향(공개 글이 비공개 버킷 이미지를 쓴다)은 운영 0건이다. 생기면 같은 원인으로 방문자에게 이미지가 깨진다.
- 방향
  - 1(마이그레이션 `20261022080000_lock_increment_post_view.sql`): anon·authenticated의 EXECUTE를 회수하고 `search_path = ''`를 건다. 본문이 `public.posts`로 적혀 있어 동작은 같다. service role은 그대로 부를 수 있다(조회수 기능을 만들 때 쓴다).
  - 2(`createPost`): 저장하기 전에 본문(`![](<버킷>:<경로>#…)`)·`imageKeys`·썸네일에서 이미지 키를 모은다. 글 공개 범위와 버킷이 다른 파일은 같은 경로로 맞는 버킷에 옮기고(storage-js 2.118 `move`의 `destinationBucket`), 키의 버킷 이름을 바꿔 저장한다. 피드는 항상 공개 버킷이다.
    - 순서: 옮기기 → 저장. 공개 → 비공개는 옮기는 순간 공개 주소가 닫혀, 뒤에서 무엇이 실패해도 새지 않는다.
    - 실패: 옮기다 실패하거나 저장이 실패하면 옮긴 파일을 되돌리고 실패를 돌려준다(글은 그대로다). 되돌리기까지 실패하면 그 파일 경로를 오류 문구에 남긴다.
    - 키 모으기·버킷 바꾸기는 순수 함수로 `lib/image.ts`에 둔다. 이미지 이동은 `assertAdmin` 뒤의 service role이라(`createPost`가 이미 그렇다) `service.ts` 규칙의 새 예외가 아니다.
  - 운영의 기존 1건은 결정 2.
- 알아 둘 점
  - 옮긴 뒤에도 옛 공개 주소가 Supabase CDN에 최대 1시간 남을 수 있다(업로드 때 `max-age=3600`).
  - 공개였던 동안 `/_next/image`가 만든 변환본은 Vercel 이미지 캐시에 남을 수 있다. 필요하면 Vercel `invalidate_by_src_images`로 지운다(운영 변경이라 사용자 확인 뒤).
  - 바깥에 이미 퍼진 주소(검색엔진 이미지 색인 등)는 지울 수 없다. 파일을 옮기면 그 주소는 404가 된다.
  - 같은 키를 두 글이 쓰면 한쪽이 깨진다. 운영에 그런 키는 0개이고, 에디터는 올릴 때마다 새 uuid 이름을 만든다.

**변경(커밋 단위)**

1. 마이그레이션: 개발 프로젝트에 적용해 권한·어드바이저를 확인하고, 사용자 확인 뒤 운영에 적용한다.
2. `lib/image.ts`의 키 모으기·버킷 바꾸기와 `lib/image.test.ts`.
3. `createPost`의 이미지 이동과 `lib/actions/posts.test.ts`(이동 대상, 호출 순서, 실패 때 되돌리기, 피드).
4. 문서: CLAUDE.md 구조 절의 이미지 줄("저장할 때 글 공개 범위에 맞는 버킷으로 옮긴다"), 로드맵 진행 현황과 이 절의 결과.

**착수 전에 정할 것**

1. 카테고리로 숨긴 글(공개 글이지만 비공개 카테고리에 있거나 카테고리가 없는 아티클)
   - (a) 글 공개 범위만 본다(권장). 이번 문제(비공개 글)를 막는다. 카테고리로 숨긴 글의 이미지는 공개 버킷에 남는다(운영에 이미지가 있는 그런 글은 0개). 알려진 문제에 남긴다.
   - (b) 카테고리 공개 범위까지 본다. 글을 저장할 때 카테고리도 보고, 카테고리 공개 범위를 바꾸거나 카테고리를 지워 글을 옮길 때 그 글들의 이미지를 모두 옮긴다. 여러 글을 옮기다 중간에 실패하는 경우를 다뤄야 해 일이 커진다.
2. 운영 `post-3ba694`
   - (a) 배포 뒤 관리자가 수정 화면에서 그대로 다시 저장한다(권장). 새 저장 경로가 파일 7개를 옮기므로 운영 확인을 겸한다.
   - (b) 배포 전에 일회성으로 옮긴다(Storage API 스크립트와 본문 키 수정). 노출은 빨리 닫히지만 한 번 쓰고 버릴 코드가 생긴다.

**확인**

- `npm run lint && npm run typecheck && npm test`.
- 마이그레이션: anon·authenticated EXECUTE 없음, service_role 있음, 어드바이저에서 이 함수의 경고 3개가 사라진다.
- 개발 서버(개발 DB, 관리자 로그인은 사용자가 한다)
  - 공개로 쓰며 이미지를 올린 뒤 비공개로 저장한다. 파일이 비공개 버킷으로 옮겨지고, 옛 공개 주소는 404, 관리자 상세에서는 이미지가 보인다.
  - 반대로 비공개 → 공개로 저장하면 방문자 상세에서 이미지가 보인다.

**하지 않는 것**: 버킷에 남은 안 쓰는 이미지 정리(13절 테스트 이미지 5개 등), `set_updated_at`의 search_path 경고(트리거 함수라 RPC로 부를 수 없다), 조회수 기능, 공개 버킷을 없애고 모든 이미지를 앱이 내려주기(방문자 이미지 요청이 매번 함수 호출이 된다).

> **결과** (2026-10-22): 결정 1 (a) 글 공개 범위만, 결정 2 (a) 배포 뒤 다시 저장. 1~4 구현, 마이그레이션은 개발·운영 모두 적용했다. 개발 서버 저장 확인까지 했다(아래).
> - 1 개발(MCP `apply_migration`)
>   - 권한: anon·authenticated EXECUTE 없음, service_role·postgres 있음, `search_path=""`.
>   - anon 역할로 부르면 `42501 permission denied for function increment_post_view`다.
>   - service_role로 `post-dev001`에 부르면 빈 search_path에서도 1을 돌려준다(예외로 롤백해 조회수는 0 그대로).
>   - 보안 어드바이저: 이 함수의 경고 3개가 사라졌다. 남은 것은 전부터 있던 `set_updated_at` search_path와 유출 비밀번호 차단 2개다.
> - 1 운영(사용자 확인 뒤, 파일 원문 그대로): 이력 버전 `20261022052208`. anon·authenticated EXECUTE 없음, service_role 있음, `search_path=""`, 어드바이저도 개발과 같다(경고 2개).
> - 2·3: `lib/image.ts`에 `imageBucketFor`·`imagePathsInBucket`·`replaceImageBucket`, `createPost`가 저장 전에 옮기고 실패하면 되돌린다.
>   - 계획과 다르게: 하나를 못 옮겨도 나머지는 끝까지 시도한 뒤, 옮긴 것을 모두 되돌린다(이동·되돌리기를 한 함수로 쓴다).
>   - 원래 버킷에 파일이 없는 키도 실패로 본다. 운영의 이미지 참조 11개(본문·첨부·썸네일)는 모두 파일이 있어 건너뛰기를 따로 두지 않았다. 실패하면 문구에 키가 나와 본문에서 지우면 된다.
> - 테스트: `lib/image.test.ts` +4, `lib/actions/posts.test.ts` +6(옮기는 대상·순서, 피드, 맞는 버킷은 Storage를 안 부름, 이동 실패, 되돌리기 실패 문구, 저장 실패). 수정 전 코드로는 새 액션 테스트 6개 중 5개가 실패했다. 전체 300개 통과, lint·typecheck 통과.
> - 남은 확인
>   - 배포 뒤 운영 `post-3ba694`를 다시 저장하고 공개 주소 7개가 닫혔는지 확인한다. 필요하면 Vercel 이미지 캐시를 지운다.
> - 첫 저장 확인(2026-10-22 14:28 KST)은 운영 사이트(배포 전 코드)에서 됐다. 개발 DB에는 04:21 UTC 이후 저장·업로드가 없고, `localhost:2025`는 개발 데이터를 보인다.
>   - 운영에 남은 것: 비공개 테스트 글 `post-03f805`(제목 "공개", 05:28:59 UTC), 공개 버킷 이미지 `2026-10-22/12e82503-fd6e-4499-a124-91d9a26d5176.png`(05:28:50). 본문 키는 `post-images-public` 그대로다.
>   - 지울지는 사용자가 정한다. 글을 지워도 Storage 파일은 남는다. 배포 뒤 다시 저장하면 이미지는 비공개 버킷으로 옮겨진다.
> - 개발 서버 확인(2026-10-22 14:33 KST, `localhost:2025`, 개발 DB, 관리자. 저장은 사용자가 했다)
>   - 흐름: 공개 상태에서 이미지 업로드(05:33:05 UTC, 공개 버킷) → 글 `post-2cd023` 저장(05:33:11) → 비공개로 바꿔 저장.
>   - 비공개 저장 때 파일이 먼저 비공개 버킷으로 옮겨졌고(Storage `updated_at` 05:33:18.730), 바로 뒤에 글이 저장됐다(05:33:18.794). 같은 이름의 파일은 비공개 버킷에만 있고, 본문 키도 `post-images-private:`로 바뀌었다.
>   - 쿠키 없는 요청: 상세 404, `/article` 목록에 slug 없음, `/api/images` 비공개 401.
>   - 옛 공개 주소는 Cloudflare 캐시가 계속 내준다(`cf-cache-status: HIT`, `max-age=3600`, `last-modified` 05:33:06). 업로드 직후 에디터가 공개 주소로 미리보기를 불러올 때 캐시에 들어갔다. 캐시를 우회하면 원본은 400(`BYPASS`)이라, 알아 둘 점의 "최대 1시간"이 실제로 생긴다. 무료 플랜이라 Smart CDN 자동 무효화가 없다.
>   - 관리자 상세 화면의 이미지 표시는 이 세션에서 보지 못했다(관리자 쿠키가 없다).
> - 배포(2026-10-22, 사용자 요청): 커밋 9개(`ee96ea0`~`d4ee8fd`, 다른 작업의 폰트·다이어리·에디터 테스트·13·14절 문서 포함)를 main에 push했다.
>   - push 전: 미커밋 변경 없음(남아 있던 13·14절 문서는 `d4ee8fd`로 커밋), lint·typecheck 통과, `npm test` 종료 코드 0(300개, Unhandled Error 없음), 운영 값으로 `npm run build` 성공(정적 131쪽).
>   - Vercel 커밋 상태와 GitHub 검사(`check`)가 모두 `success`다.
>   - 운영 사이트(쿠키 없음): 홈·`/article`·`/feed`·`/diary`·공개 상세(`post-d167c4`) 200, 비공개 글 `post-3ba694`·`post-03f805`·`post-29faf8` 404, `/api/images` 비공개 401, `/mypage` 307(로그인), sitemap에 비공개 slug 0개, 배포된 CSS에 `Pretendard Variable`이 있다.
>   - 남은 일: 운영 `post-3ba694`를 관리자로 다시 저장(파일 7개 이동), 테스트 글 `post-03f805`와 그 공개 버킷 이미지 정리.
> - 운영 `post-3ba694` 다시 저장(2026-10-22 14:45 KST, 사용자가 관리자로 저장)
>   - 파일 7개가 05:45:03.38~05:45:04.57 UTC에 비공개 버킷으로 옮겨졌고, 바로 뒤 05:45:04.63에 글이 저장됐다. 본문 6개·썸네일 키가 모두 `post-images-private:`이고, 파일은 비공개 버킷에만 있다.
>   - 옛 공개 주소 7개는 모두 400이다. Cloudflare에 남은 사본도 없다(`cf-cache-status: BYPASS`).
>   - Vercel 이미지 변환 캐시: 옛 주소 7개 × 너비 16개(16~3840, q=75)가 모두 400(`INVALID_IMAGE_OPTIMIZE_REQUEST`, MISS)이다. 같은 형식의 공개 글 썸네일은 200(HIT)이라 요청 형식은 맞다. 남은 변환본이 없어 `invalidate_by_src_images`는 하지 않았다.
>   - 방문자 상세는 404다. 남은 일은 테스트 글 `post-03f805` 정리뿐이다.
> - 같은 글을 05:54에 두 번 더 저장했다(테스트 글 정리 대신). Supabase 로그 기준(UTC)
>   - 05:54:15~18: 파일 7개를 비공개 → 공개 버킷으로 옮기고 **공개**로 저장했다(Storage `ObjectCreated:Move .../post-images-public/...`).
>   - 05:54:24~26: 다시 공개 → 비공개 버킷으로 옮기고 비공개로 저장했다. 그래서 약 8초 동안 글과 이미지가 공개였다.
>   - 그 8초 동안 공개 주소로 이미지를 가져간 요청(브라우저·`vercel-image-optimization`)은 Supabase 로그에 없다. 방문자가 페이지를 열었는지는 Vercel 로그가 있어야 알 수 있다(Vercel MCP 403).
>   - 지금: 상세 404(`x-vercel-cache: REVALIDATED`), 홈·`/article`·카테고리 `회고`·sitemap에 없음, 공개 주소 400(`BYPASS`). 두 방향(공개 ↔ 비공개) 이동이 모두 운영에서 동작한 것도 확인됐다.
> - 테스트 글 `post-03f805`(제목 "공개")는 사용자가 다시 저장하지 않고 삭제했다(06:02 UTC 조회). 그래서 이미지 `2026-10-22/12e82503-fd6e-4499-a124-91d9a26d5176.png`가 공개 버킷에 남아 공개 주소로 열린다(200). 가리키는 글이 없어 앱으로는 옮길 수 없다.
>   - 지금 비공개 글이 공개 버킷 이미지를 쓰는 경우는 0건이다.
>   - 오늘 공개 버킷에 올라와 어느 글도 쓰지 않는 파일은 이것과 13절의 테스트 이미지 5개(03:07~03:21 UTC)를 합쳐 6개다. 지우려면 사용자가 Supabase 대시보드 Storage에서 지운다(운영 데이터 삭제라 이 세션은 하지 않는다).
>   - 사용자가 대시보드에서 6개를 지웠다(06:04 UTC). 6개 모두 없고 공개 주소는 400(`BYPASS`, CDN 사본 없음)이다. 글이 쓰는 이미지 11개는 모두 그대로다. 대시보드가 빈 폴더에 `.emptyFolderPlaceholder`(0바이트)를 만들었다.
>   - 그래도 어느 글도 쓰지 않는 파일이 공개 버킷에 14개(2025-12-30~2026-01-22, `.xicon` 1개 포함), 비공개 버킷에 3개(2026-01-02) 있다. 본문·첨부·썸네일 어디에도 이름이 없다. 공개 버킷의 2026-01-03 04:06·04:18·04:48 UTC 3개는 `post-3ba694` 이미지(04:14~04:52 UTC)와 같은 시간대라, 그 글을 쓰다 뺀 이미지일 수 있다. 정리할지는 사용자가 정한다.
>   - 사용자가 대시보드에서 공개 버킷의 14개를 지웠다(2026-10-22). 14개 모두 없고 공개 주소는 400(`BYPASS`)이다. 글이 쓰는 이미지 11개는 그대로이고, 공개 버킷에는 공개 글이 쓰는 4개만 남았다(쓰지 않는 파일 0개). 비공개 버킷의 쓰지 않는 3개는 밖에서 열리지 않아 남겼다.

## 20. 검색·조회수·이미지 자동 정리·RSS·댓글 메일 알림·방명록

- 근거(2026-10-22, 사용자 요청): 기능 추천 가운데 사용자가 고른 것이다.
  - 검색·조회수·이미지 자동 정리·댓글 메일 알림은 서브에이전트가 각자 worktree에서 병렬로 만들고, 메인 세션이 합쳐 검사한다. 서로 고치는 파일이 겹치지 않게 나눴다.
  - RSS는 메인 세션이 만든다. 방명록은 DB 구조가 바뀌고 정책을 정해야 해서 결정을 받은 뒤 만든다.
  - 사용자가 바로 진행을 요청해 1~5는 아래 기본값으로 정했다. 바꿀 것이 있으면 결과를 보고 고친다.
- 방향
  1. 검색: `/search?q=`. 공개 아티클만 찾는다(다이어리는 본문이 관리자 전용, 피드는 상세 화면이 없다). 제목·본문 부분 일치, anon 키 PostgREST와 태그 캐시(`posts:public:blog`). 헤더·모바일 입력은 form 제출이라 정적 HTML이 그대로다. 결과 페이지는 noindex.
  2. 조회수: 아티클 상세는 정적 그대로 둔다. 브라우저가 `/api/views`를 탭 세션마다 한 번 부르고 돌려받은 수로 숫자를 바꾼다. 라우트는 공개 아티클인지 RLS로 확인한 뒤에만 service role로 `increment_post_view`를 부른다(비공개·없는 글은 같은 404). 관리자 화면(draft mode)과 봇은 세지 않는다. `service.ts`의 새 예외다.
  3. 이미지 자동 정리: 글을 지우면 그 글의 이미지를, 수정해서 빠진 이미지는 저장이 성공한 뒤 지운다. 다른 글이 쓰는 파일은 남기고, 지우기 실패는 글 작업을 실패로 돌리지 않는다. 저장하지 않고 버린 업로드와 이미 쌓인 옛 파일은 범위 밖이다.
  4. RSS: `/rss.xml`. 최근 공개 아티클 30개(요약 300자)를 넣고, 모든 페이지 head에 alternate 링크를 둔다. 피드 글은 상세 주소가 없어 넣지 않는다. 직접적인 검색 순위 요소는 아니지만 수집을 돕는다(Google Search Console의 사이트맵 제출, 네이버 서치어드바이저 RSS 제출).
  5. 댓글 메일 알림: Resend HTTP API를 `fetch`로 부른다. 환경 변수는 `RESEND_API_KEY`·`COMMENT_NOTIFY_EMAIL`·`COMMENT_NOTIFY_FROM`이고, 값이 없으면 보내지 않는다. 관리자 댓글은 알리지 않고, 응답 뒤(`after()`)에 text 본문만 보낸다. 받는 주소는 사용자가 정한 주소를 Vercel 환경 변수로 넣는다(저장소에 쓰지 않는다).
  6. 방명록(계획): 표 `guestbook_entries`(작성자 → profiles, `author_is_admin` 트리거, 내용, 답글용 parent_id, 작성 시각)와 RLS(누구나 읽기, 로그인 사용자 본인 쓰기, 본인·관리자 지우기). `/guestbook`은 anon 읽기와 태그 캐시로 정적, 쓰기는 서버 액션(zod, 길이 제한), 헤더 메뉴 추가. 댓글과 같은 모양이면 `CommentsThread`를 다시 쓴다.

**방명록 착수 전에 정할 것**

1. 누가 쓰나: (a) 로그인 사용자만(권장, 댓글과 같은 계정·닉네임·사진, 스팸·사칭에 강하다) (b) 비로그인도(이름·비밀번호, 스팸 대책과 비밀번호 해시가 필요하다).
2. 비밀글: (a) 두지 않는다(권장, 정적 목록 그대로) (b) 관리자만 보는 비밀글(목록에서 내용 대신 "비밀글입니다").
3. 답글: (a) 관리자 답글 한 단계(권장) (b) 두지 않는다 (c) 누구나 한 단계(댓글과 같게).
4. 메일 알림: (a) 새 방명록도 5와 같은 방식으로 알린다(권장) (b) 알리지 않는다.

**확인**

- `npm run lint && npm run typecheck && npm test`.
- 개발 서버(쿠키 없는 요청): 검색 결과에 비공개·비공개 카테고리 글이 없다. 조회수가 오르고 같은 탭에서 다시 열면 그대로다. 비공개 글 slug로 `/api/views`를 부르면 404이고 조회수가 그대로다. `/rss.xml`에 공개 아티클만 있다. 글을 지우면 Storage 파일도 지워진다(개발 DB, 관리자 작업은 사용자가 한다).
- 메일: 사용자가 Resend 키와 받는 주소를 넣은 뒤 실제 댓글 1개로 한 통 받는다.

**하지 않는 것**: 검색 자동완성·형태소 분석, 조회수 일·월 통계, 이미 쌓인 옛 이미지 일괄 정리, RSS 전문(본문 HTML) 싣기, 이메일 구독(뉴스레터).

> **결과** (2026-10-22): 방명록 결정은 1 (a) 로그인 사용자만, 2 (b) 비밀글 둠(관리자와 작성자만 내용을 본다), 3 (a) 관리자 답글만, 4 (a) 메일 알림. 1~6 모두 구현해 이 폴더 작업 트리에 합쳤다(커밋 전).
> - 합친 방법: 에이전트마다 worktree 브랜치에 커밋했고(`0d32ba4` 검색, `8866bfe` 조회수, `4bae7d0` 이미지 정리, `7e9f1f6` 메일), 메인이 각 브랜치의 diff를 검토한 뒤 작업 트리에 적용했다.
> - 합칠 때 고친 것: 검색이 복제한 공개 조회 요청·열 목록을 `publicPosts.ts`의 `fetchPublicRest`·`POST_COLUMNS`로 공통화, 메일 요청에 10초 타임아웃, 조회수 라우트 주석의 함수 이름.
> - 계획과 다르게: 검색은 `ilike` 대신 `imatch`다(PostgREST가 `ilike` 값의 `*`를 `%`로 바꿔 `**`가 거의 모든 글에 맞았다). 이미지 정리는 업로드가 만들지 않는 글자(쉼표·따옴표 등)가 든 키를 지우지 않는다(다른 글이 쓰는지 확인하는 배열 조건이 깨진다).
> - 검사: lint·typecheck 통과, 테스트 300개 → 400개 모두 통과.
> - 개발 서버 확인(쿠키 없는 요청, 개발 DB)
>   - RSS: 200 `application/rss+xml`, 공개 아티클 4개(`/article`과 같음), 숨긴 글 0개, XML 파싱 성공, 모든 페이지 head에 alternate 링크.
>   - 조회수: 공개 글 200(0→1→2), 비공개 글·비공개 카테고리 글·없는 글 404(DB 값 0 그대로), 봇 204, 잘못된 slug 400, `no-store`. 브라우저에서 처음 열면 숫자가 바뀌고 같은 탭에서 새로고침하면 다시 세지 않는다.
>   - 검색: 비공개 글 제목("비공개 아티클"·"gkdl"·"rhdro")은 0건, "공개"는 공개 카테고리의 공개 글 2개만, 다이어리·피드 0건, 필터를 끼워 넣는 검색어 0건, `noindex`. 데스크톱·모바일 375px(가로 넘침 없음)·다크 모드 화면.
> - 운영 읽기 전용 확인: 글 171개의 slug가 모두 조회수 라우트 형식에 맞는다. Storage 주소를 직접 쓰는 글은 0개라 이미지 정리가 그런 파일을 잘못 지울 일이 없다.
> - 방명록(서브에이전트, worktree 커밋 `6364e59`·`399428e`·`0ab6716`을 같은 방식으로 합침)
>   - DB: `20261022093000_guestbook.sql`. 내용을 두 표로 나눴다(RLS는 행 단위라 한 열만 숨길 수 없다). 개발 프로젝트에만 적용했다(이력 `20261022075226`). 롤백 트랜잭션으로 RLS 36개 항목(비밀 내용은 관리자·작성자·원글 작성자만, 일반 사용자 답글·남의 이름·관리자 표시 조작·공개 글에 비밀 내용 끼우기 거절, anon은 비밀 표·함수·쓰기 모두 42501, 삭제 권한과 cascade)을 확인했다. 보안 어드바이저에 새 경고 없음.
>   - 합칠 때 더한 것: 헤더·모바일 메뉴 "방명록", 공개 조회를 `fetchPublicRest`로 공통화, 새 방명록 메일 알림(관리자 글 제외, 비밀글은 내용 없이 알림만 — 메일은 Resend 발송 기록·메일함에 남아 DB 밖으로 나간다), sitemap에 `/guestbook`.
>   - 개발 서버(쿠키 없는 요청): 200, 공개 글과 관리자 공개 답글은 보이고, 비밀글 두 개는 "비밀글입니다"로만 나온다. HTML·RSC 페이로드에 비밀 내용 0회, 데스크톱·모바일 375px·다크 모드.
>   - 검사: lint·typecheck 통과, 테스트 430개 통과.
>   - 배포 순서: `/guestbook`은 빌드 때 anon으로 표를 읽어, 운영에 마이그레이션이 없으면 빌드가 실패한다. 운영 적용 → push 순서로 한다.
> - 사용자 확인(개발 서버, 관리자 로그인): 방명록만 흰 카드(`bg-surface`+그림자)라 배경에서 튄다. 댓글·목록처럼 배경 위 테두리·구분선으로 바꿨다(데스크톱·다크 모드, 새 탭 콘솔 오류 0).
> - 커밋(사용자 요청, 기능별로 나눔): RSS `94b9d36`, 조회수 `22fd81d`, 검색 `43c27d8`, 이미지 자동 정리 `8c9b05c`, 댓글 메일 `5740b8d`, 방명록 DB `c6f9e81`, 방명록 화면·액션·메뉴·알림 `f473d29`, 방명록 무효화 `281a6e3`. 여러 기능이 함께 고친 파일(`publicPosts.ts`·헤더·모바일 메뉴·`notify.ts`)은 기능별 중간 버전을 인덱스에 올려 커밋마다 그 기능만 들어가게 했다.
> - 운영 적용(사용자 요청, 파일 원문 그대로 MCP `apply_migration`): 이력 `20261022081759 guestbook`, md5가 파일·개발과 같다.
>   - 적용 전: 방명록 표·함수 없음, 트리거 함수 `set_comment_author_is_admin` 있음.
>   - 적용 뒤: 두 표 RLS 켜짐, 정책 5개, anon은 entries 읽기만, 비밀 표·쓰기 함수는 authenticated만(함수는 security invoker), 트리거 있음. 정책·표 권한·열 권한·열·제약 5개 범주 해시가 개발과 같다.
>   - anon 역할(롤백): entries 0행, 비밀 표 42501, 쓰기 함수 42501. 보안 어드바이저는 전부터 있던 2개뿐이다.
> - 배포(2026-10-22, 사용자 요청): 운영 마이그레이션을 먼저 적용한 뒤 커밋 9개(`94b9d36`~`4b52a19`)를 push했다.
>   - push 전: 작업 트리 깨끗, lint·typecheck 통과, `npm test` 종료 코드 0(430개), 운영 값 `npm run build` 성공(정적 131 → 134쪽, `/guestbook`·`/rss.xml` ○ 하루, `/search`·`/api/views` ƒ, 아티클 상세 ● 그대로).
>   - Vercel 커밋 상태와 GitHub `check` 모두 `success`.
>   - 운영 사이트(쿠키 없음): 홈·`/article`·`/feed`·`/diary`·`/guestbook`·`/search`·공개 상세 200, 비공개 글 404, 헤더에 방명록, sitemap에 `/guestbook`. `/rss.xml`은 `application/rss+xml`·XML 파싱 성공·글 1개(방문자에게 보이는 아티클이 1개다: 공개 글 28개 중 27개가 비공개 카테고리 "책"·"운동"에 있다). 검색은 "싱글스레드"·"node.js"로 그 글을 찾고, 비공개 글 제목("회고"·"부동산")은 0건. 방명록은 로그인 안내와 빈 목록. `/api/views`는 잘못된 slug 400, 비공개 글 404, 봇 204(운영 조회수를 바꾸지 않는 경우만 호출했다).
> - 남은 확인(배포 뒤 사용자): 방명록 로그인 흐름(쓰기·비밀글 본인 보기·관리자 답글·삭제), 공개 글을 열 때 조회수가 오르는지, 글을 지우거나 이미지를 뺄 때 실제 Storage 삭제, 메일 실제 발송(Resend 키·받는 주소를 Vercel에 넣은 뒤).

## 21. 관리자 화면 토글 없애기

- 근거(2026-10-29, 사용자 요청): 관리자는 한 명이고, 로그인해 있으면 버튼 없이 비공개 글이 다 보여야 한다. 14절 뒤에도 draft 쿠키가 브라우저 세션 쿠키라 브라우저를 다시 열면 꺼져 있어 토글을 눌러야 했다.
- 결정(2026-10-29, 사용자): 토글을 없앤다. 14절에서 고르지 않은 "브라우저를 열 때마다 관리자 세션을 보고 켜기"를 고른다.
- 방향: `/api/admin-mode`·`getPreviewViewer`·`requireAdmin`·RLS는 그대로다. 일반 사용자가 비공개 글을 못 보는 근거는 이 서버 판정이라 바뀌지 않는다.
  1. `AdminModeToggle` → `AdminModeSync`(그리는 것 없음). `SiteHeader`에 하나만 둔다. 서버 값(`draftMode().isEnabled`)과 브라우저 세션의 `is_admin`이 다르면 맞춘다. 관리자인데 꺼져 있으면 켜고, 관리자가 아닌데 켜져 있으면 끈다(지금 토글의 남은 쿠키 정리). 바꾸면 `router.refresh()`, 켜기가 거절되면 토스트.
  2. `MobileNav`: 토글과 메뉴 버튼의 켜짐 점·"관리자 화면 켜짐" 이름을 지우고 `adminMode` prop을 없앤다.
  3. 그대로 둠: 로그인 때 켜기(`LoginForm`, 이동한 첫 화면부터 관리자 화면), 로그아웃 때 끄기, 저장 뒤 켜기, 이동 진행 막대.
- 알아 둘 점: 브라우저를 다시 연 첫 화면은 방문자 화면이 잠깐 보인 뒤 관리자 화면으로 바뀐다. 관리자가 방문자 화면을 보려면 로그아웃하거나 시크릿 창을 쓴다. 관리자 이동은 늘 동적 렌더링이다(14절에서 받아들인 속도).
- 확인: `AdminModeSync` 테스트, `npm run lint && npm run typecheck && npm test`, 브라우저(방문자 헤더·모바일 메뉴).

> **결과** (2026-10-29): 1~3 구현(미커밋).
> - 테스트: `AdminModeSync.test.tsx` 6개(먼저 써서 이전 토글에서 3개 실패 확인). 전체 447개 통과, lint·typecheck 통과.
> - 브라우저(`next dev`, 개발 DB, 방문자): 데스크톱 헤더와 모바일 메뉴에 토글·"관리자 화면" 글자·메뉴 버튼 점이 없고, `/api/admin-mode` 요청이 나가지 않는다.
> - 남은 확인: 관리자 로그인 상태(로그인은 사용자가 한다). 쿠키를 끈 뒤 새로고침하면 저절로 켜지는지(브라우저를 다시 연 경우), 로그아웃 때 꺼지는지.

## 22. 작성 칸 인라인 서식 기호 항상 숨기기

- 근거(2026-10-29, 사용자 요청): 툴바로 기울임을 넣으면 커서가 그 줄에 남아 `*`가 흐리게 붙어 보인다(12절의 "커서 줄은 기호를 드러냄").
- 결정(2026-10-29, 사용자): 인라인 서식 기호는 커서 위치와 상관없이 항상 숨긴다. "커서가 그 서식 안에 있을 때만 드러내기"는 고르지 않았다.
- 범위: 굵게·기울임(`*`)·취소선·형광펜·밑줄·인라인 코드 백틱. 제목 `#`·인용 `>`·링크 괄호·이스케이프는 지금처럼 커서 줄에서 흐리게 드러낸다.
- 숨긴 기호는 커서가 한 덩어리로 건너뛴다(atomic). 그러지 않으면 보이지 않는 `**` 사이에 커서가 멈춰 방향키가 먹지 않는 것처럼 보인다.
- 알아 둘 점: 닫는 기호 바로 뒤에서 지우면 보이지 않는 기호가 지워져 서식이 풀린다(⌘Z로 되돌린다). 닫는 기호 앞뒤는 화면에서 같은 자리로 보인다.

> **결과** (2026-10-29): 구현(미커밋). `lib/markdown-live-preview.test.ts` 기대값을 먼저 바꿔 3개 실패를 확인한 뒤 고쳤다.
> - 브라우저(`next dev`, 로그인 없는 임시 화면으로 확인 뒤 지움): 커서를 서식 단어 안에 두어도 `*`·`**`가 보이지 않는다. 툴바 기울임은 넣자마자 기호 없이 기울임만 보이고(원문 `*둘째 줄*`), 다시 누르면 풀린다. 닫는 `*` 앞에서 친 글자는 기울임 안에, 방향키로 넘어간 뒤 친 글자는 밖에 들어간다. 닫는 기호 바로 뒤의 Backspace는 기호를 지워 기울임이 풀리고 ⌘Z로 돌아온다.
> - 확인하지 못한 것: 실제 한글 IME 조합 입력(12절에서도 남은 확인).

## 23. 관리자 페이지 이동 속도 개선

- 요청(2026-11-04): 배포 환경의 페이지 이동이 느려 전체 점검 후 코드 수정 계획을 세운다. 사용자가 느린 상황은 관리자 로그인 상태라고 확인했다.
- 근거: 운영 공개 페이지 6곳을 각각 3회 읽었고 모두 `x-vercel-cache: HIT`였다. 연결을 재사용한 반복 요청의 TTFB(첫 응답까지의 시간)는 약 17~30ms였다. 검색은 동적 응답으로 반복 요청 약 63~115ms였다. 이 수치는 관리자 이동 시간이나 화면 완성 시간이 아니다.
- 코드에서 확인한 원인: 관리자 draft mode는 페이지·데이터 캐시를 우회한다. 상세는 인증 → 글 → 댓글을 기다린다. 아티클 목록은 전체 본문을 받아 12개로 자르고, 다이어리 목록은 쓰지 않는 본문까지 클라이언트에 넘긴다.
- 상태: 1차 구현, 개발 DB 전후 측정, 운영 배포와 구간별 측정을 마쳤다(이 절 끝의 결과).

**1차 구현: 인증·공개 범위를 유지하면서 조회 비용 줄이기**

1. 변경 전 기준 측정
   - 개발 DB를 쓰는 프로덕션 빌드(`next build`·`next start`)에서 관리자 로그인 상태로 아티클 목록·카테고리·다음 페이지·상세·다이어리·피드 이동을 측정한다. 개발 서버의 컴파일 시간과 섞지 않는다. 실제 로그인 세션이 없으면 사용자 로그인 뒤 측정하고, 방문자 수치를 관리자 기준으로 대신 쓰지 않는다.
   - 같은 계정·데이터·브라우저·네트워크에서 각 이동을 10회 확인한다. 첫 요청을 따로 기록하고 반복 요청의 중앙값·최댓값, 클릭부터 내용 표시까지의 시간, 인증/DB 요청 수, 응답 크기를 남긴다. 첫 요청이 느리다는 이유만으로 콜드 스타트라고 단정하지 않는다.
   - 완료 기준: 변경 전후 비교표를 만들 수 있는 기준값 확보. 토큰·쿠키·본문을 로그에 남기지 않는다.

2. 다이어리 목록에서 본문 제거
   - 관리자 목록 전용 조회가 `id,slug,title,created_at,visibility`만 읽고 그 필드만 반환한다. 댓글 개수·본문·이미지 목록도 조회하지 않는다. 월 이동에 필요한 제목·날짜 목록은 유지한다.
   - 대상: `lib/server/posts.ts`와 테스트, `app/diary/(list)/page.tsx`, 필요한 경우 `DiaryIndexClient`의 목록 타입.
   - 완료 기준: 관리자 목록 응답에 본문이 없고 달력·날짜 선택·비공개 제목 표시가 동일하다. 테스트는 반환 객체에 불필요한 필드가 없는지까지 확인한다.

3. 아티클 목록에서 해당 페이지 본문만 조회
   - DB 조회에 카테고리 조건과 12개 범위를 적용한다. 요약을 만들 본문은 그 12개만 읽는다.
   - 사이드바 개수는 본문 없는 카테고리 이름 목록으로 계산한다. 글 목록·개수용 목록·카테고리 조회는 인증 후 병렬 실행한다. 카테고리마다 따로 count 요청을 보내지는 않는다.
   - 미분류 글의 전체 개수, 등록되지 않은 카테고리 표시, 비공개 카테고리, 빈 카테고리, 없는 페이지의 404를 보존한다. 개수용 조회가 DB 응답 행 제한으로 잘리지 않도록 확인한다.
   - 대상: `lib/server/posts.ts`와 테스트, `app/article/(list)/ArticleIndex.tsx`와 목록 동작 테스트.
   - 완료 기준: 전체 글 수와 무관하게 본문 조회는 최대 12개다. 13개 이상 글을 가진 개발 데이터로 페이지 중복·누락과 개수를 확인한다. 응답량 감소와 함께 이동 시간도 비교한다(조회가 하나 늘어나는 비용 포함).

4. 관리자 아티클 상세의 글·댓글 조회 합치기
   - 아티클 상세 전용 조회가 PostgREST 관계 임베드로 글과 댓글·작성자 프로필을 함께 읽는다. 쿠키 세션 클라이언트의 RLS(행별 접근 권한)를 적용하고 댓글 순서를 유지한다.
   - 공개 상세와 공개 메타데이터 조회는 유지한다. 수정 화면·다이어리가 사용하는 단일 글 조회는 그 용도로 남긴다. 이번 변경으로 호출부가 사라지는 코드만 정리한다.
   - 대상: `lib/server/posts.ts`와 테스트, `app/article/[slug]/page.tsx`와 상세 동작 테스트.
   - 완료 기준: 관리자 상세의 글·댓글 DB 왕복이 2회에서 1회로 줄어든다(인증·공개 메타데이터 요청은 별도 집계). 댓글 없음·답글·작성자 표시·비공개 글·다른 타입 경로의 동작을 개발 DB에서도 확인한다.

**측정 뒤 필요할 때 진행할 후속 범위**

- 로딩 표시: 조회 개선 뒤에도 상세 클릭 후 기존 화면에 머무는 시간이 길면, 관리자 링크의 `useLinkStatus`로 클릭한 항목에 대기 상태를 표시한다. 기존 상단 진행 막대와 중복되지 않게 역할을 정한다. 빠른 이동의 깜빡임과 실패·취소·뒤로 이동 때 표시 해제를 확인한다. 이 작업의 효과는 서버 시간 감소와 구분해서 보고한다.
- 읽기 인증: 인증 왕복이 여전히 큰 비중이면 읽기 전용 관리자 판정에 검증된 `getClaims()` 사용을 검토한다. 비대칭 서명 사용을 확인하고 쓰기·삭제·이미지·관리자 모드 켜기의 `getUser()` 검증은 유지한다. 토큰 만료 전 권한 철회 반영 시점이 달라지는 별도 동작 변경이므로, 1차 구현에 섞지 않고 구체적인 영향과 함께 제안한다.
- 피드: 현재 글 수·응답 크기에서 병목이 확인되면 제한 조회와 ‘더 보기’를 별도 계획으로 다룬다. 처음 보이는 글 수와 이동 방식이 달라지는 작업이다.
- 방문자 글 링크 미리 불러오기, 관리자 화면 분리, 공유 캐시 도입, DB 구조 변경, 요금제 변경은 이번 1차 범위에 넣지 않는다. 관리자 요청마다 발생하는 작업을 먼저 줄인다.

**최종 확인과 완료 기준**

- 단계별로 회귀 테스트를 먼저 추가하고 `npm run lint && npm run typecheck && npm test` 및 프로덕션 빌드를 확인한다. DB 접속 불가로 빌드가 막히면 그 한계를 기록한다.
- 방문자·일반 로그인·관리자 세 가지 상태에서 목록·상세 권한을 확인한다. 비공개 글·다이어리 본문이 공개 HTML·페이지 전환 응답·공유 캐시에 나오지 않아야 한다. 공개 페이지의 정적 생성·캐시 적중도 유지한다.
- 관리자에서 글 수정·댓글 작성 뒤 내용이 즉시 갱신되는지 개발 DB로 확인한다. 운영에는 테스트 글·댓글을 쓰지 않는다.
- 같은 조건의 변경 전후 측정으로 페이지별 중앙값·느린 표본·응답 크기·요청 수를 보고한다. 개선 비율은 실측 전 확약하지 않는다. 데이터량만 줄고 이동이 느려진 변경은 완료로 처리하지 않고 원인을 확인한다.
- 현재 미커밋된 에디터·저장 액션 변경은 이 작업과 분리한다. 단계별로 검토 가능한 변경을 만들고, 커밋·운영 배포는 별도 요청 때 진행한다. 운영에서의 최종 비교는 배포 후 수행할 확인으로 남긴다.

> **결과** (2026-11-04): 1차 2~4 구현, 개발 DB 전후 측정과 동작 확인. 커밋·운영 배포 전이다.
> - 구현: `lib/server/posts.ts`에 `getDiaryIndexDirectly`·`getArticleListDirectly`·`getArticleWithCommentsDirectly`를 두고, 호출부가 사라진 `getPostsDirectly`·`getCommentsDirectly`를 지웠다. 쪽 사이 순서가 흔들리지 않게 `id`를 둘째 정렬로 두고, 개수 조회는 응답 행 상한에 잘리지 않게 전체 수에 닿을 때까지 읽는다.
> - 계획과 다르게: 측정을 구현 앞이 아니라 뒤에 했다. 구현 전 커밋과 구현한 코드를 임시 폴더에 따로 빌드해(포트 2026·2027) 같은 시간대에 번갈아 쟀다. `.env*`를 읽지 않으려고 임시 빌드에는 개발 프로젝트의 URL·anon 키만 줬고, service role 자리에도 anon 키를 넣었다. 관리자 조회는 쿠키 세션이라 상관없고, 임시 빌드의 방문자 다이어리 목록만 비어 있다.
> - 측정 조건: 로컬 `next start`, 개발 DB, 관리자 로그인(사용자가 했다), 운영과 비슷한 가짜 데이터(아티클 59개, 다이어리 114개, 한 글에 댓글 10개). 시간은 페이지 전환 요청(RSC) 10회를 두 번 쟀다. 로컬이라 브라우저와 서버 사이의 전송 시간은 거의 들어가지 않는다.
>
>   | 화면 | 중앙값 전 → 후(ms, 1·2회차) | 최댓값 전 → 후(ms, 1·2회차) | 브라우저 응답 크기 | 서버가 받은 DB·Auth 응답 | 바깥 요청 수 |
>   |---|---|---|---|---|---|
>   | 아티클 목록 | 98·82 → 76·71 | 154·105 → 92·86 | 44KB 그대로 | 101KB → 26KB | 3 → 4(병렬) |
>   | 카테고리 | 75·75 → 70·70 | 307·96 → 74·73 | 43KB 그대로 | 101KB → 26KB | 3 → 4(병렬) |
>   | 다음 쪽 | 71·75 → 68·67 | 80·262 → 79·147 | 44KB 그대로 | 101KB → 26KB | 3 → 4(병렬) |
>   | 상세(댓글 10개) | 91·97 → 65·60 | 134·110 → 69·67 | 22KB 그대로 | 8KB 그대로 | 4 → 3 |
>   | 다이어리 | 71·71 → 64·62 | 88·95 → 66·79 | 165KB → 40KB | 153KB → 21KB | 2 → 2 |
>   | 피드(바꾸지 않음) | 61·65 → 60·59 | 88·140 → 64·73 | 19KB 그대로 | 2KB 그대로 | 2 → 2 |
>
> - 실제 링크 클릭부터 내용 표시까지(10회 중앙값): 상세 116 → 77ms, 아티클 목록 321 → 314ms, 다이어리 319 → 317ms.
> - 목록 클릭은 서버가 빨라져도 약 315ms에 머문다. 시간이 서버 응답과 상관없이 일정하고 React의 `FALLBACK_THROTTLE_MS`가 300이라, `(list)/loading.tsx` 스켈레톤이 뜨면 내용 교체가 최소 300ms 미뤄지는 것으로 본다. `loading.tsx`가 없는 상세는 서버 시간이 그대로 보인다. 운영에서 관리자 응답이 300ms를 넘으면 이 바닥은 드러나지 않는다.
> - 화면 동일: 관리자 상태 21개 주소의 본문 글자·링크 해시가 전후 같다(아티클 5쪽과 범위 밖 쪽, 카테고리와 그 다음 쪽, 비공개·빈·없는 카테고리, 비공개 글, 댓글·답글이 있는 글, 다이어리를 아티클 경로로 연 경우, 없는 글, 다이어리 목록·상세). 쪽 5개의 글 59개가 겹침·빠짐 없이 전체 글 수와 같고, 미분류 글은 전체 수에만 들어간다.
> - 권한: 쿠키 없는 요청의 상태와 캐시가 전후 같다(목록·공개 상세 200 `HIT`, 비공개 글 404, `/mypage` 307). 방문자 목록·sitemap·RSS에 비공개 측정 글 제목이 없고, 다이어리 본문은 관리자 HTML·페이지 전환 응답에도 없다.
> - 쓰기(개발 서버, 개발 DB): 공개 카테고리 글에 쓴 댓글이 화면·다음 요청·방문자 첫 요청에 바로 보인다. 글 제목 수정도 상세·목록의 관리자·방문자 화면에 바로 보인다.
> - 검사: lint·typecheck 통과, 테스트 472개 통과(같은 폴더의 다른 작업 포함), 전후 빌드의 경로 표(○·●·ƒ)가 같고 운영 값 `npm run build` 성공. 측정용 가짜 데이터(글 160, 댓글 11, 카테고리 1)는 지웠다.
> - 확인하지 못한 것
>   - 일반 로그인 계정의 브라우저 확인. 일반 계정은 draft mode가 아니라 방문자와 같은 정적 화면을 받고, 새 조회의 공개 글 제한은 단위 테스트로 봤다.
>   - 등록되지 않은 카테고리 표시. 글의 카테고리에 FK가 있어 만들 수 없고, 이 코드는 바꾸지 않았다.
> - 확인하다 본 것: 비공개 카테고리 안의 공개 글에는 관리자가 댓글을 등록해도 DB에 들어가지 않았다(`post-perf0002`, 0행). 알려진 문제의 댓글 항목과 같은 범위이고 댓글 쓰기 코드는 바꾸지 않았다.

> **운영 결과** (2026-11-04): 이 절의 커밋 5개만 `f09b131`까지 배포한 뒤 관리자로 쟀다. 운영에는 읽기 요청만 보냈다.
> - 배포: Vercel과 GitHub `check`가 성공했다. 방문자 화면은 200이고 다시 받으면 `HIT`다. 비공개 글 5개와 비공개 카테고리 글 2개가 404이고 목록·sitemap·RSS에 없다.
> - 관리자 화면: 전체 글 59개와 카테고리 합계가 같고, 1·2쪽이 겹치지 않고, 비공개 글 상세가 열린다.
> - 전환 응답(RSC, 10회)
>
>   | 화면 | 중앙값(ms) | 90%(ms) | 최댓값(ms) | 크기 |
>   |---|---|---|---|---|
>   | 아티클 목록 | 215 | 277 | 464 | 48KB |
>   | 카테고리 | 199 | 261 | 339 | 50KB |
>   | 다음 쪽 | 211 | 218 | 271 | 49KB |
>   | 상세 | 182 | 248 | 280 | 24KB |
>   | 다이어리 | 182 | 202 | 206 | 40KB |
>   | 피드 | 173 | 179 | 183 | 19KB |
>
> - 구간별 시간(중앙값)
>   - 브라우저와 Vercel 캐시 왕복: 22ms(정적 파일, 방문자 `/robots.txt`).
>   - proxy: 약 90ms. 세션 쿠키가 있으면 같은 `/robots.txt`가 113ms, DB를 읽지 않는 `/api/views` 400 응답이 49ms에서 137ms가 된다.
>   - 함수 실행: 약 27ms(위 400 응답 49ms − 캐시 왕복 22ms).
>   - Supabase 처리(`response.origin_time`, 측정 구간): Auth 9ms(90% 20ms), 글 12ms(90% 23ms), 카테고리 10ms(90% 17ms). Vercel과 Supabase 사이 이동 시간은 들어가지 않는다.
> - 클릭부터 내용 표시까지(8회 중앙값): 상세 207ms, 아티클 목록 457ms, 다이어리 514ms. 목록은 전환 요청이 216ms·252ms에 끝나고 주소가 157ms·216ms에 바뀌는데, 내용은 주소가 바뀐 뒤 약 300ms에 나온다. 앞서 본 React의 스켈레톤 최소 표시 시간과 같다.
> - 판단
>   - 인증과 DB는 병목이 아니다. 서버 자원 부족을 가리키는 값도 없어 유료 전환 근거가 없다.
>   - 남은 지연은 목록의 스켈레톤 대기(요청이 끝난 뒤 약 240~260ms)와 세션 쿠키 요청마다 붙는 proxy(약 90ms)다.
> - 측정 주의: 패널이 가려지면 `requestAnimationFrame`이 약 1초에 한 번만 돌아 첫 클릭 측정이 모두 약 710ms로 나와 버렸다. `MutationObserver`로 다시 쟀다. 패널은 가려진 채였지만 상세의 클릭 시간(207ms)이 전환 요청(196ms)과 맞는다.
> - 확인하지 못한 것
>   - 운영의 변경 전 값. 배포 전에 재지 않아 운영 전후 비교는 없다.
>   - 콜드 스타트. 측정 때 첫 요청은 174~312ms였고 함수가 깨어 있었을 수 있다.
>   - Vercel의 자원 사용량.
> - 로그에서 본 것: 측정 중 `posts`에 service role POST(14:57:43 UTC)와 DELETE(14:58:05 UTC)가 하나씩 있었다. 측정이 보낸 요청이 아니고 어디서 왔는지는 확인하지 못했다. 글 수는 59·114·3 그대로다.

> **2차 결과** (2026-11-05): 목록의 스켈레톤 대기를 없앴다. 운영에 배포했다(`85f81b5`).
> - 변경: 아티클·피드·다이어리 목록의 `loading.tsx`를 지웠다. 응답을 기다리는 동안 이전 화면이 남고, 관리자에게는 150ms 뒤 상단 진행 막대가 뜬다. 다이어리 스켈레톤은 페이지의 Suspense 대체 표시로 쓰여 `DiaryListSkeleton`으로 옮겼다. 홈의 `loading.tsx`는 바꾸지 않았다.
> - 측정: 로컬 `next start`, 개발 DB, 변경 전후 빌드. 클릭부터 내용 표시까지이고, 관리자는 8회 중앙값, 방문자는 첫 클릭이다.
>
>   | 화면 | 전(ms) | 후(ms) |
>   |---|---|---|
>   | 관리자 아티클 목록 | 320 | 97 |
>   | 관리자 다이어리 | 317 | 89 |
>   | 관리자 피드 | 317 | 82 |
>   | 방문자 피드 첫 클릭 | 307 | 38 |
>   | 방문자 다이어리 첫 클릭 | 309 | 316 |
>
> - 방문자의 반복 이동은 전후 모두 15ms 안쪽이다. 다이어리 첫 클릭이 그대로인 것은 페이지 안의 Suspense 대체 표시 때문으로 본다(`useSearchParams`). 이 코드는 UI 작업 브랜치가 나누고 있어 건드리지 않았다.
> - 확인: 관리자 화면의 없는 쪽·없는 카테고리가 404 상태 코드다. 방문자 HTML에서 아티클·피드의 스켈레톤이 빠졌고, 전후 빌드의 경로 표(○·●·ƒ)가 같다. lint·typecheck·테스트 473개가 통과했다.
> - 바뀌는 동작: 미리 받지 못한 링크를 느린 망에서 누르면 방문자는 응답이 올 때까지 이전 화면을 본다. 아티클 상세와 같은 동작이다.
> - 배포: `f09b131` 뒤의 커밋 7개(다른 세션의 개발 서버 안전장치·테스트·문서 5개 포함)를 올렸다. 올리기 전 lint·typecheck·테스트 473개, 운영 값 `npm run build`를 통과했다. Vercel과 GitHub `check`가 성공했다. 방문자 화면은 다시 받으면 `HIT`이고, 비공개 글 5개와 비공개 카테고리 글 2개가 404이며 목록·sitemap·RSS에 없다.
> - 운영 측정(관리자, 클릭부터 내용 표시까지, 9회 중 첫 회를 뺀 중앙값)
>
>   | 화면 | 전(ms) | 후(ms) | 최댓값(ms) |
>   |---|---|---|---|
>   | 아티클 목록 | 457 | 246 | 376 |
>   | 다이어리 | 514 | 266 | 512 |
>   | 피드 | 재지 않음 | 256 | 957 |
>   | 상세(바꾸지 않음) | 207 | 226 | 300 |
>   | 홈(바꾸지 않음) | 재지 않음 | 458 | 515 |
>
> - 배포 직후 첫 클릭은 249~527ms였다. 아티클·피드·상세는 스켈레톤이 뜨지 않았고 진행 막대는 9회 모두 떴다. 다이어리는 9회 중 2회 스켈레톤이 떠서 약 510ms가 걸렸다. 홈은 9회 모두 스켈레톤이 떴다.
> - 남은 일: 다이어리에 가끔 뜨는 스켈레톤, proxy 왕복(약 90ms) 결정.

> **3차 결과** (2026-11-05): 홈의 스켈레톤 대기를 없앴다. 커밋·운영 배포 전이다.
> - 변경: 홈의 `loading.tsx`와 최신 아티클을 감싼 Suspense를 함께 지웠다. 하나만 지우면 남은 쪽의 스켈레톤이 그대로 뜬다. 쓰는 곳이 없어진 `LatestArticlesSkeleton`·`ArticleListItemSkeleton`도 지웠다.
> - 측정(로컬 `next start`, 개발 DB, 변경 전후 빌드, 관리자, 9회 중 첫 회를 뺀 중앙값): 홈 클릭부터 내용까지 305 → 54ms. 스켈레톤은 9회 모두 뜨다가 한 번도 뜨지 않는다. 같은 측정의 아티클 목록은 100ms로 전후가 같다.
> - 확인: 방문자 홈 HTML은 200 `HIT`이고 글 링크 수가 전후 같으며 스켈레톤이 빠졌다. 관리자 홈에 첫 화면 제목, 글 링크, "더 보기"가 있다. 전후 빌드의 경로 표(○·●·ƒ)가 같고 lint·typecheck·테스트 473개가 통과했다.
> - 남은 일: 운영 배포 뒤 측정.

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
13. (해결: 19절, 운영 DB 적용) `increment_post_view`(`security definer`)를 anon·authenticated가 RPC로 부른다. 비공개 글·다이어리의 조회수를 바꾸고 slug가 있는지 알 수 있다.
14. (해결: 19절, 운영 배포·`post-3ba694` 다시 저장) 비공개 글의 이미지가 공개 버킷에 남는다. 버킷이 올리는 순간의 공개 범위로 정해지고 저장할 때 다시 보지 않는다. 운영 1건(`post-3ba694`, 파일 7개).
15. Supabase Auth의 유출 비밀번호 차단(Leaked password protection)이 꺼져 있다(보안 어드바이저). 관리자 계정이 뚫리면 비공개 글이 모두 열린다. 대시보드에서 사용자가 켠다.

### 동작·데이터

- (해결: 4·5단계, 방문자는 있는 다이어리면 안내 화면·없으면 404, 본문은 관리자 전용 유지) 다이어리 상세는 없는 글·다른 타입 비공개 글에도 404 대신 "비공개 다이어리"를 200으로 보인다. 공개 다이어리도 RLS(`type <> 'diary'`) 때문에 비관리자에게 안 보일 수 있다(기본 스키마 확인 필요).
- (해결: 4단계) 수정 화면(`/article|feed|diary/edit/[slug]`)에서 없는 slug는 404 대신 500이다. 로그인 후에는 수정 화면이 아니라 목록으로 돌아간다.
- 카테고리 이름 변경·삭제가 트랜잭션이 아니다. 순서 변경(upsert)이 그 사이 삭제된 카테고리를 되살릴 수 있다. 비공개 카테고리 글을 공개 카테고리로 옮기면 바로 공개된다.
- `createPost`의 카테고리 자동 생성은 이름 검증(50자, `/` 금지)을 건너뛴다.
- (해결: 4단계) 글 수정으로 카테고리·slug가 바뀌면 옛 카테고리 목록 캐시를 무효화하지 않는다. `revalidatePath(`/${type}`)`는 아티클에서 없는 경로 `/blog`를 무효화한다.
- 발행 중에도 발행 버튼이 살아 있어 두 번 발행될 수 있다(`PostEditor`가 `createPost`를 transition 밖에서 기다린다).
- (정책은 해결: 13단계 `20261022050000_comments_delete_owner.sql`) 댓글 DELETE 정책이 마이그레이션에 없고, `deleteComment`는 지운 행 수를 확인하지 않아 RLS가 막아도 성공을 돌려준다. 비공개 카테고리 글에는 관리자도 댓글을 못 쓸 수 있다. 읽지도 못한다: `comments_select_public`의 카테고리 조건에 `is_admin()`이 없어 관리자 상세에도 댓글이 비어 보인다(2026-10-22 점검, 새지 않는 방향).
- (해결: 5단계) 공개 목록의 댓글 수는 anon 키로 세는데 댓글 조회 정책이 로그인 사용자 전용이라 항상 0일 수 있다. 댓글 액션은 캐시를 무효화하지 않는다.
- 아티클 "전체 글" 수가 카테고리별 합계라 카테고리 없는 공개 글이 빠진다(`getPublicPostCounts`). 실제로는 수만이 아니라 글 자체가 방문자에게 안 보인다: anon RLS `posts_select_public`이 공개 카테고리 행을 요구해 목록·상세·검색·sitemap·RSS에서 모두 빠진다(2026-10-22, 개발 `post-dev005`로 확인).
- 피드 댓글 화면이 없다. (해결: 5단계) 피드 카드의 좋아요 수·댓글은 하드코딩이다.
- (해결: 20절, 아티클) 조회수(`view_count`)를 올리는 코드가 없다. 다이어리 상세의 조회수 표시는 여전히 세지 않는다. 조회수 라우트에는 서버 쪽 중복 제거·요청 수 제한이 없어 직접 POST로 수를 부풀릴 수 있다.
- (해결: 4단계) 날짜를 UTC로 표시해(`toISOString().slice(0, 10)`, 서버 `toLocaleDateString`) KST 오전에 쓴 글이 전날로 보인다. 표지 이미지 규칙도 화면마다 다르다(홈은 썸네일만, 아티클은 썸네일 → 첫 이미지, 피드는 첫 이미지).
- 다이어리 달력: 날짜 필터는 KST, 월 필터·라벨은 브라우저 시간대라 월 경계에서 어긋날 수 있다.
- (해결: 13단계) 기본 스키마(테이블·`is_admin()`·기본 RLS·Storage 버킷)가 `supabase/migrations/`에 없다.

### 성능·SEO

- (해결: 5단계) ISR이 사실상 꺼져 있다. 목록·상세가 `getViewer`(쿠키)를 읽어 매 요청 동적 렌더링된다.
- (해결: 9단계, 아티클 목록은 5단계) 로그인 요청마다 Auth 서버 왕복이 두 번이고(`proxy.ts`·`getViewer`), 아티클 목록의 조회 3개가 차례로 실행되며, 상세의 댓글 조회가 글을 한 번 더 읽는다.
- (해결: 5단계) 공개 fetch의 revalidate 기본값이 60초라 세그먼트의 86400초와 어긋난다.
- (아티클·다이어리 목록은 해결: 23절) 관리자 피드 목록은 본문까지 전부 읽는다(페이지네이션 없음).
- (해결: 5단계, 아티클 상세) 상세 페이지에 `generateMetadata`가 없어 글 제목이 `<title>`·OG에 안 들어간다.
- sitemap은 공개 아티클 1000개에서 잘리고 본문(`content`)까지 읽는다. (해결: 5단계) 60초마다 다시 만들어질 수 있다.

### 기타

- (검색은 해결: 20절) 헤더·모바일 메뉴의 검색 입력이 동작하지 않는다. `BackButton`은 뒤로 가지 않고 항상 `fallbackHref`로 이동한다.
- (해결: 5단계, 액션 삭제) `getComments`는 쓰는 곳이 없다.
- 오류 응답에 `DB Error: <원문>`을 그대로 돌려준다.
- `globals.css`에 `@custom-variant dark`가 없어 `dark:` 유틸리티는 OS 설정을, 색 토큰은 next-themes의 `.dark`를 따른다. `ThemeToggle`은 `theme`을 봐서 시스템 테마일 때 첫 클릭에 바뀌지 않을 수 있다.
- (해결: 4단계) 목록·홈 `loading.tsx`가 하위 경로에도 적용돼 상세·쓰기·로그인 화면에 엉뚱한 스켈레톤(목록·홈)이 뜬다.
