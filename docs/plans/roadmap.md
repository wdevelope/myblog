# 로드맵

- **작성:** 2026-10-21
- **근거:** 운영 재개 준비 중 코드 검토 결과, 사용자 결정(2026-10-21: MongoDB 전환을 철회하고 Supabase를 유지, 리전 정렬·ISR 복구를 앞당김)

이전 `tasklist.md`를 대체한다. 끝난 단계는 `[x]`로 바꾸고 한 줄 결과를 남긴다.

## 진행 현황

- [x] 0. Claude 기본 세팅 — CLAUDE.md, `.env` 접근 차단, Vitest, CI(lint·typecheck·test), commit 스킬
- [ ] 1. Supabase 백업과 도메인 재등록 (사용자 작업)
- [ ] 2. 관리자 판정 보안 수정
- [ ] 3. 리전 정렬과 ISR 복구

## 1. Supabase 백업과 도메인 재등록

- 2026-10-21 오전에는 `mgyoglaujbxfbuxxlcfj.supabase.co`가 DNS에서 조회되지 않았고(NXDOMAIN), 같은 날 오후에는 REST 엔드포인트가 401로 응답한다(프로젝트 활성). 대시보드에서 상태를 확인한다.
- `pg_dump`로 스키마·데이터를, Storage 버킷(`post-images-public`·`post-images-private`) 파일을 백업한다. 기본 스키마가 저장소에 없어서 덤프가 유일한 원본이다.
- 프로젝트가 활성이면 아래 보안 문제가 열린 채 운영되므로 바로 2단계를 하거나 백업 후 다시 일시정지한다.
- 도메인 `w-life.store`가 만료돼 whois에서 등록 가능 상태다(2026-10-21). 다시 등록하거나 갱신가가 낮은 도메인으로 옮긴다. 도메인을 바꾸면 Vercel 도메인, Supabase Auth의 Site URL·Redirect URLs, `NEXT_PUBLIC_SITE_URL`, CLAUDE.md·README의 주소를 함께 바꾼다.
- 기한 2026-10-30: 외부 자료에 따르면 기존 무료 프로젝트도 이날부터 Data API(PostgREST) 접근에 명시적 Postgres GRANT가 필요하다. `publicPosts.ts`가 anon 키로 PostgREST를 직접 부르므로, Supabase 공지로 적용 여부를 확인하고 해당하면 GRANT를 새 마이그레이션으로 추가한다.

## 2. 관리자 판정 보안 수정

- 대상: 알려진 문제 보안 1~4. `lib/server/admin.ts`, `middleware.ts`, 로그인 폼·`/auth/callback` 리다이렉트.
- 방향: 관리자 판정은 `auth.getUser()`로 검증한 사용자의 `app_metadata.is_admin` 또는 `public.users.is_admin`만 본다. 요청 헤더·`user_metadata`는 보지 않는다. 미들웨어는 세션 갱신만 한다. 리다이렉트는 같은 출처 경로만 허용한다. 각각 회귀 테스트를 같이 쓴다.
- 배포 전 확인: 실제 관리자 계정의 플래그가 `app_metadata` 또는 `users` 테이블에 있는지(`user_metadata`에만 있으면 관리자도 막힌다), DB 함수 `is_admin()`이 무엇을 보는지.

## 3. 리전 정렬과 ISR 복구

- 방향: Supabase(Postgres·Auth·Storage)와 Vercel Hobby를 유지해 월 0원으로 운영한다. 느린 원인은 무료 플랜 성능보다 매 요청 동적 렌더링과 리전 불일치로 본다. MongoDB·Firebase는 검토 후 보류했다(인증·이미지 저장소·RLS까지 바꿔야 하고 위 원인은 그대로 남는다).
- 순서: 아래 1 → 2 → 3. 각각 짧은 계획을 확인받은 뒤 구현하고, 시작 전과 끝난 뒤 `/`·`/article`·상세 하나의 TTFB를 잰다.

1. **리전 정렬.** `vercel.json`이 없어 Vercel 함수가 기본 리전 `iad1`(워싱턴)에서 돈다. 대시보드에서 Supabase 리전을 확인하고, `vercel.json`의 `regions`로 함수 리전을 같은 곳(서울이면 `icn1`)에 맞춘다.
2. **ISR 복구.** 대상은 알려진 문제 "ISR이 사실상 꺼져 있다"와 댓글 액션의 캐시 미무효화다. 공개 목록·상세가 `headers()`·쿠키를 읽지 않게 하고, 로그인·관리자 여부로 달라지는 부분(관리자 버튼, 댓글 입력)은 클라이언트 말단 컴포넌트로 뺀다. 쓰기·댓글 액션은 상세 경로까지 무효화한다. `next build` 출력에서 해당 경로가 정적·ISR로 나오는지 확인한다.
   - 착수 전에 정할 것: 관리자에게 비공개 글을 공개 목록에 섞어 보일지, 관리자 전용 경로로 분리할지. 다이어리 목록처럼 비관리자에게 본문을 지워 보이는 화면의 처리.
3. **일시정지 방지.** ISR이 살면 DB 요청이 줄어 무료 플랜의 7일 무활동 일시정지 위험이 커진다. Vercel Cron(Hobby는 하루 1회)으로 가벼운 조회를 하는 라우트 핸들러를 두고 `CRON_SECRET`으로 막는다.

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

### 동작·데이터

- 다이어리 상세는 없는 글·다른 타입 비공개 글에도 404 대신 "비공개 다이어리"를 200으로 보인다. 공개 다이어리도 RLS(`type <> 'diary'`) 때문에 비관리자에게 안 보일 수 있다(기본 스키마 확인 필요).
- 수정 화면(`/article|feed|diary/edit/[slug]`)에서 없는 slug는 404 대신 500이다. 로그인 후에는 수정 화면이 아니라 목록으로 돌아간다.
- 카테고리 이름 변경·삭제가 트랜잭션이 아니다. 순서 변경(upsert)이 그 사이 삭제된 카테고리를 되살릴 수 있다. 비공개 카테고리 글을 공개 카테고리로 옮기면 바로 공개된다.
- `createPost`의 카테고리 자동 생성은 이름 검증(50자, `/` 금지)을 건너뛴다.
- 댓글 DELETE 정책이 마이그레이션에 없고, `deleteComment`는 지운 행 수를 확인하지 않아 RLS가 막아도 성공을 돌려준다. 비공개 카테고리 글에는 관리자도 댓글을 못 쓸 수 있다.
- 공개 목록의 댓글 수는 anon 키로 세는데 댓글 조회 정책이 로그인 사용자 전용이라 항상 0일 수 있다. 댓글 액션은 캐시를 무효화하지 않는다.
- 피드 댓글 화면이 없다. 피드 카드의 좋아요 수·댓글은 하드코딩이다.
- 조회수(`view_count`)를 올리는 코드가 없다.
- 다이어리 달력: 날짜 필터는 KST, 월 필터·라벨은 브라우저 시간대라 월 경계에서 어긋날 수 있다.
- 기본 스키마(테이블·`is_admin()`·기본 RLS·Storage 버킷)가 `supabase/migrations/`에 없다.

### 성능·SEO

- ISR이 사실상 꺼져 있다. 목록·상세가 `getCurrentUser`(`headers()`)를 읽어 매 요청 동적 렌더링된다. 상세 경로는 `revalidatePath`도 하지 않는다.
- 관리자 아티클 목록·피드·다이어리 목록은 본문까지 전부 읽는다(페이지네이션 없음).
- 상세 페이지에 `generateMetadata`가 없어 글 제목이 `<title>`·OG에 안 들어간다.
- sitemap은 공개 아티클 1000개에서 잘리고, 60초마다 다시 만들어질 수 있다.

### 기타

- 헤더·모바일 메뉴의 검색 입력이 동작하지 않는다. `BackButton`은 뒤로 가지 않고 항상 `fallbackHref`로 이동한다.
- Next 16에서 `middleware.ts` 이름이 폐기 예정이다(빌드 경고, `proxy.ts`로 변경).
- 아티클 목록 페이지에 `coverSrcFromImageKey` 중복 구현이 있다. `CommentForm`·`getComments`는 쓰는 곳이 없다.
- 오류 응답에 `DB Error: <원문>`을 그대로 돌려준다.
