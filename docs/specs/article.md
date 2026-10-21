# 명세: 아티클 화면

- **상태:** 현행
- **ID 접두:** ART
- **근거:** 현행 코드 역작성(2026-10-21)
- **코드 경로:** `app/article/page.tsx`, `app/article/loading.tsx`, `app/article/[slug]/`, `app/article/write/`, `app/article/edit/`, `app/article/category/`
- **승인:** 2026-10-21

## 1. 목적

방문자에게 `blog` 타입 글(화면 이름 "아티클")을 카테고리·페이지 단위 목록과 상세로 보여 준다. 로그인 사용자는 상세에서 댓글을 보고 쓴다. 관리자는 비공개 글·카테고리까지 보고 쓰기·수정 화면에 들어간다.

## 2. 범위

- 포함: `/article` 목록(카테고리 사이드바·페이지네이션), `/article/[slug]` 상세(본문·이미지·댓글 영역·관리 메뉴), `/article/write`·`/article/edit/[slug]` 진입 권한과 에디터 초기값, `/article/category/[slug]` 리다이렉트, 목록 로딩 스켈레톤.
- 제외: 글 조회·저장·삭제 함수와 에디터(posts), 카테고리 선택·설정 UI와 액션(categories), 댓글 목록·작성(comments), 이미지 표시·프록시(images), 관리자 판정(auth).

## 3. 시나리오

### ART-1. 관리자가 아니면 목록은 공개 아티클만 12개씩 보여 준다

- 전제: 비로그인 또는 관리자가 아닌 로그인 사용자.
- 행동: `/article?page=2`를 연다.
- 결과: `getPublicPostCounts("blog")`로 사이드바 수를, `getPublicPosts({ type: "blog", category: "", page: 2, limit: 12 })`로 목록을 받는다. `getPostsDirectly`는 부르지 않는다. 총 페이지가 2 이상이면 `이전`·`2 / <총 페이지>`·`다음`을 보이고 링크는 `/article?page=1`·`/article?page=3`이다(카테고리가 있으면 `/article?category=<인코딩>&page=N`, 끝 페이지에서는 `#`과 비활성). `page`가 양수가 아니면 1이다.
- 테스트 층: 단위

### ART-2. 관리자 목록은 비공개 글을 포함하고 카테고리를 메모리에서 거른다

- 전제: 관리자.
- 행동: `/article?category=<slug>&page=1`을 연다.
- 결과: `getPostsDirectly({ type: "blog", user })`를 한 번 불러 전체(비공개 포함)로 "전체 글"·카테고리별 수를 세고, `categorySlug`가 `<slug>`인 글만 남겨 12개씩 자른다. 공개 캐시 함수는 부르지 않는다. 비공개 글 카드에는 자물쇠, 공개 글에는 지구본 아이콘을 보인다. 비공개 카테고리 항목 앞에 자물쇠를 보인다. `categories` 테이블에 없는 카테고리라도 글이 있으면 사이드바 끝(정렬값 1,000,000)에 붙인다.
- 테스트 층: 단위

### ART-3. 관리자가 아니면 보이지 않는 카테고리를 고를 때 404다

- 전제: 비관리자. 카테고리 `<slug>`가 `private`이거나 없다.
- 행동: `/article?category=<slug>`를 연다.
- 결과: 세션 클라이언트의 `categories` 조회(RLS `categories_select`) 결과에 `<slug>`가 없으므로 `notFound()`. 관리자는 같은 요청에서 404 없이 해당 글 목록을 보고, 글이 없으면 "아직 아티클이 없습니다."를 본다.
- 테스트 층: 통합(DB)

### ART-4. 쓰기 버튼과 카테고리 설정은 관리자에게만 보인다

- 전제: 관리자 / 비관리자.
- 행동: `/article`을 연다.
- 결과: 관리자에게만 `/article/write`로 가는 "아티클 쓰기" 링크와 사이드바 "전체 카테고리" 옆 `CategorySettingsModal`을 렌더링한다. 비관리자 화면에는 둘 다 없다.
- 테스트 층: 단위

### ART-5. 관리자가 아니면 비공개 아티클 상세는 404다

- 전제: 비관리자. slug가 `private` 글, 비공개 카테고리에 속한 글, 또는 없는 글이다.
- 행동: `/article/<slug>`를 연다.
- 결과: `getPostBySlugDirectly({ slug, user })`가 `visibility = public` 조건과 RLS(`posts_select_public`)로 행을 찾지 못해 status 404 오류를 던지고, 페이지는 `notFound()`를 부른다. 본문·제목은 응답에 없다.
- 테스트 층: 통합(DB)

### ART-6. 아티클이 아닌 글의 slug면 상세는 404다

- 전제: slug가 읽을 수 있는 `feed` 글이다(관리자라면 `diary` 글도 해당).
- 행동: `/article/<slug>`를 연다.
- 결과: `post.type !== "blog"`이므로 `notFound()`.
- 테스트 층: 단위

### ART-7. 상세 댓글은 로그인 사용자에게만 보인다

- 전제: 읽을 수 있는 아티클.
- 행동: 비로그인 / 로그인 상태로 `/article/<slug>`를 연다.
- 결과: 비로그인이면 `getCommentsDirectly`를 부르지 않고 "댓글" 제목, "로그인 후 댓글을 확인/작성할 수 있어요.", `/login?from=%2Farticle%2F<slug>`로 가는 "로그인하기"를 보인다. 로그인 상태면 `getCommentsDirectly({ postId: post.id, user })` 결과를 `CommentsThread`에 `postSlug`·`canWrite`·`currentUserId={user.id}`·`isAdmin`과 함께 넘긴다.
- 테스트 층: 단위

### ART-8. 관리자는 상세에서 수정·삭제 메뉴를 본다

- 전제: 관리자 / 비관리자.
- 행동: `/article/<slug>`를 연다.
- 결과: 관리자일 때만 제목 옆에 `PostActionMenu`(`editHref="/article/edit/<slug>"`, `deleteSlug=<slug>`, `deleteRedirectTo="/article"`, `ariaLabel="아티클 더보기"`)를 렌더링한다. 공개 범위 아이콘은 `private`이면 자물쇠, 아니면 지구본이다.
- 테스트 층: 단위

### ART-9. 쓰기 화면은 관리자만 연다

- 전제: 비로그인 / 관리자가 아닌 로그인 사용자 / 관리자.
- 행동: `/article/write`를 연다.
- 결과: `requireAdmin("/article/write")`를 먼저 부른다. 비로그인은 `/login?from=%2Farticle%2Fwrite`, 비관리자는 `/`로 리다이렉트된다. 관리자는 `<PostEditor type="blog" />`를 받는다.
- 테스트 층: 단위

### ART-10. 수정 화면은 관리자만, 아티클 글만 연다

- 전제: 비로그인 / 관리자가 아닌 로그인 사용자 / 관리자.
- 행동: `/article/edit/<slug>`를 연다.
- 결과: `requireAdmin("/article")`를 먼저 부른다. 비로그인은 `/login?from=%2Farticle`, 비관리자는 `/`로 리다이렉트된다. 관리자면 `getPostBySlugDirectly({ slug, user })` 뒤 `type !== "blog"`이면 `notFound()`. 아티클이면 `PostEditor type="blog"`에 `id`·`slug`·`title`·`content`·`visibility`·`categorySlug`·`imageKeys`·`thumbnailImageKey`를 초기값으로, `deleteSlug=<slug>`·`deleteRedirectTo="/article"`을 넘긴다.
- 테스트 층: 단위

### ART-11. 카테고리 경로는 쿼리 목록으로 리다이렉트한다

- 전제: 없음.
- 행동: `/article/category/<slug>`를 연다.
- 결과: `redirect("/article?category=" + encodeURIComponent(slug))`.
- 테스트 층: 단위

### ART-12. 목록·상세는 재검증 주기를 `REVALIDATE_PERIOD`로 선언한다

- 전제: 없음.
- 행동: `app/article/page.tsx`와 `app/article/[slug]/page.tsx` 모듈을 읽는다.
- 결과: 두 모듈 모두 `export const revalidate = 86400; // REVALIDATE_PERIOD`이며 값이 `REVALIDATE_PERIOD`와 같다. 쓰기·수정·카테고리 리다이렉트 경로는 `dynamic = "force-dynamic"`이다.
- 테스트 층: 단위

### ART-13. 목록 로딩 중에는 스켈레톤을 보인다

- 전제: 목록 서버 렌더링이 끝나지 않았다.
- 행동: `/article`로 이동한다.
- 결과: `app/article/loading.tsx`가 사이드바 스켈레톤 6줄과 카드 스켈레톤 6장을 그린다.
- 테스트 층: 컴포넌트(jsdom)

## 4. 계약

| 경로 | 입력 | 접근 | 렌더링 설정 | 메타데이터 제목 |
| --- | --- | --- | --- | --- |
| `/article` | `?category=<slug>`(앞뒤 공백 제거), `?page=<양수>`(기본 1) | 모두. 관리자는 비공개 글·카테고리 포함 | `revalidate = 86400` | "아티클" |
| `/article/[slug]` | `slug` | 모두. 비공개 글은 관리자만 | `revalidate = 86400` | 없음(루트 기본값) |
| `/article/write` | 없음 | 관리자 | `force-dynamic` | "아티클 쓰기" |
| `/article/edit/[slug]` | `slug` | 관리자 | `force-dynamic` | `아티클 수정: <slug>` |
| `/article/category/[slug]` | `slug` | 모두 | `force-dynamic` | 없음(리다이렉트) |

화면 상태:

- 목록 로딩: `loading.tsx` 스켈레톤.
- 목록 빈 상태: "아직 아티클이 없습니다."
- 목록 카드: 카테고리 이름(없으면 "전체"), 공개 범위 아이콘, 커버(`thumbnailImageKey` → `imageKeys[0]` → 그라데이션), 제목, `toExcerpt` 요약, 댓글 수(1 이상일 때), UTC 기준 `YYYY-MM-DD`. 링크는 `/article/<slug>`.
- 목록 사이드바: lg 이상에서 "전체 글"과 카테고리별 수를 보인다. 작은 화면은 `CategorySelect`가 대신한다.
- 상세: "← 목록으로"(`BackButton fallbackHref="/article"`), "아티클 / <카테고리>" 경로(카테고리 링크 `/article?category=<인코딩>`), 제목, 작성자 "원스", `ko-KR` 날짜, "조회수 N회", 공개 범위 아이콘, `HtmlContent` 본문, `PostImages`, 댓글 영역.

## 5. 데이터

- `/article` 목록이 `categories` 테이블의 `slug, visibility, sort_order`를 `sort_order`·`slug` 오름차순으로 직접 조회한다(세션 클라이언트, RLS `categories_select`: `visibility = 'public' or is_admin()`).
- 그 밖의 조회는 posts 명세의 함수를 쓴다.

## 6. 불변식

- 1 비공개 격리: 비관리자 목록은 anon 키 공개 조회(`getPublicPosts`·`getPublicPostCounts`)만 쓰고, 보이지 않는 카테고리는 404로 막는다. 상세는 public 조건과 RLS로 비공개 글을 404로 막는다. 비로그인에게는 댓글 조회 자체를 하지 않는다.
- 2 관리자 판정: 쓰기·수정 화면은 `requireAdmin`, 관리자 UI와 비공개 분기는 `isAdminDb`로 정한다. 두 함수의 현행 위반은 [auth 명세](auth.md) §7.
- 3 글 타입 규칙: 상세·수정 화면은 `type !== "blog"`이면 `notFound()`.
- 4 쓰기는 관리자만: 쓰기·수정 화면 진입을 `requireAdmin`으로 막는다(저장 권한 자체는 posts 명세). 댓글 작성 UI는 로그인 사용자에게만 준다.
- 5 공개 캐시 정합성: 태그 캐시를 쓰는 공개 조회는 비관리자 분기에서만 부르고, 관리자 분기는 세션 클라이언트로 캐시 없이 조회한다. `revalidate`는 리터럴 86400에 `// REVALIDATE_PERIOD` 주석을 단다.

## 7. 미결·확인 필요

1. `/article`·`/article/[slug]`는 `revalidate = 86400`을 내보내지만 `getCurrentUser`가 `headers()`를 읽으므로 요청마다 동적 렌더링된다. ISR은 사실상 동작하지 않는다(빌드 출력으로 확인 필요). 반대로 이 페이지를 정적으로 바꾸면 관리자 응답(비공개 글·카테고리)이 공유 캐시에 들어가 불변식 5를 어긴다. 또 저장 액션은 `/article/<slug>` 경로를 무효화하지 않으므로, 정적화하면 상세 수정이 최대 하루 늦게 반영된다.
2. 상세의 `403 → redirect("/")` 분기는 도달하지 않는다. 비관리자 조회에 이미 public 조건이 붙어 비공개 글은 항상 404다(posts §7과 같은 원인).
3. 수정 화면은 `getPostBySlugDirectly`의 예외를 잡지 않는다. 없는 slug면 `notFound()`가 아니라 오류 화면(500)이 된다.
4. 수정 화면의 `requireAdmin("/article")`은 `from`이 수정 URL이 아니라 목록이다. 로그인 후 수정 화면으로 돌아오지 않는다.
5. 상세에 `generateMetadata`가 없어 글 제목·요약이 `<title>`·Open Graph에 들어가지 않는다. SEO 목표와 어긋난다.
6. 비관리자 목록의 댓글 수는 anon 키 조회의 `comments(count)`에서 온다. 저장소 마이그레이션의 댓글 조회 정책은 `authenticated` 전용이라, anon 정책이 기본 스키마에 없다면 비관리자에게는 댓글 수가 늘 0이라 숨겨진다(확인 필요).
7. 조회수는 늘리는 코드가 없어 항상 "조회수 0회"다(posts §7).
8. 관리자 목록은 매 요청 모든 아티클(본문 포함)을 받아 메모리에서 거르고 자른다. 글이 많아지면 느려진다.
9. `page`가 정수가 아니어도(예: `1.5`) 그대로 오프셋 계산에 쓰인다.
10. 목록 파일에 `lib/image.ts`의 `coverSrcFromImageKey`와 거의 같은 사본이 있다. `NEXT_PUBLIC_SUPABASE_URL`이 없을 때 사본은 `null`을, 원본은 `/api/images` 경로를 돌려준다.
11. auth §7의 헤더 신뢰 문제에 기대는 곳: 쓰기·수정 화면의 `requireAdmin`, 목록·상세의 관리자 UI(쓰기 버튼·카테고리 설정·수정·삭제 메뉴) 노출. 관리자 분기의 글 조회는 세션 클라이언트라 데이터는 RLS 범위로 제한될 것으로 보이나 확인 필요.

## 8. 관련 코드

- auth: `getCurrentUser`·`isAdminDb`·`requireAdmin`(`lib/server/admin.ts`), `createSupabaseServerClient`(`lib/supabase/server.ts`).
- posts: `getPostsDirectly`·`getPostBySlugDirectly`·`getCommentsDirectly`(`lib/server/posts.ts`), `getPublicPosts`·`getPublicPostCounts`(`lib/server/publicPosts.ts`), `toExcerpt`(`lib/markdown.ts`), `Post` 타입(`lib/types.ts`), `PostEditor`, `HtmlContent`, `PostActionMenu`.
- images: `PostImages`.
- comments: `CommentsThread`.
- categories: `CategorySelect`(모바일 카테고리 선택), `CategorySettingsModal`(관리자 카테고리 설정).
- site: `BackButton`, `CardBody`·`Skeleton`(`app/_components/ui.tsx`).
