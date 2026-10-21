# 명세: 피드 화면

- **상태:** 현행
- **ID 접두:** FEED
- **근거:** 현행 코드 역작성(2026-10-21)
- **코드 경로:** `app/feed/`
- **승인:** 2026-10-21

## 1. 목적

방문자에게 짧은 글(`feed` 타입)을 인스타그램식 카드 타임라인으로 보여 준다. 관리자는 같은 화면에서 쓰기·수정·삭제로 들어간다.

## 2. 범위

- 포함: `/feed` 목록과 카드(`FeedCard`), `/feed/write`·`/feed/edit/[slug]` 진입 권한과 에디터 초기값, 목록 로딩 스켈레톤.
- 제외: 글 조회·저장 함수와 에디터, 피드 public 강제·자동 제목(posts), 이미지 프록시(images), 관리자 판정(auth). 피드 단건 상세 경로와 피드 댓글 화면은 없다(§7).

## 3. 시나리오

### FEED-1. 관리자가 아니면 피드 목록은 공개 피드만 보여 준다

- 전제: 비로그인 또는 관리자가 아닌 로그인 사용자.
- 행동: `/feed`를 연다.
- 결과: `getPostsDirectly({ type: "feed", user })`가 `visibility = public` 조건으로 피드 전체를 최신순으로 돌려준다. 페이지네이션은 없다. 카드에 `PostActionMenu`와 "피드 쓰기"가 없다.
- 테스트 층: 통합(DB)

### FEED-2. 관리자는 쓰기 버튼과 카드별 수정·삭제 메뉴를 본다

- 전제: 관리자.
- 행동: `/feed`를 연다.
- 결과: 상단에 `/feed/write`로 가는 "피드 쓰기"(`ButtonLink variant="secondary"`)를 보인다. 각 카드 머리에 `PostActionMenu`(`editHref="/feed/edit/<slug>"`, `deleteSlug=<slug>`, `deleteRedirectTo="/feed"`)를 보인다.
- 테스트 층: 컴포넌트(jsdom)

### FEED-3. 피드가 없으면 빈 상태 문구를 보인다

- 전제: 볼 수 있는 피드가 0개다.
- 행동: `/feed`를 연다.
- 결과: 카드 대신 "아직 피드가 없습니다."를 보인다.
- 테스트 층: 단위

### FEED-4. 카드의 좋아요·댓글·저장 버튼은 서버에 아무것도 보내지 않는다

- 전제: 피드 카드 하나.
- 행동: 하트·말풍선·북마크 버튼을 누른다.
- 결과: 클라이언트 상태만 바뀐다. 하트는 "좋아요 7개"를 "좋아요 8개"로, 말풍선은 고정 문구 "방문객 피드가 좋네요 😊"를 펼치고, 북마크는 "내 마음속에 저장 ✨"을 1.2초 보인다. 실제 댓글 수가 1 이상이면 "댓글 N개"를 함께 보인다. 네트워크 요청은 없다.
- 테스트 층: 컴포넌트(jsdom)

### FEED-5. 쓰기 화면은 관리자만 연다

- 전제: 비로그인 / 관리자가 아닌 로그인 사용자 / 관리자.
- 행동: `/feed/write`를 연다.
- 결과: `requireAdmin("/feed/write")`를 먼저 부른다. 비로그인은 `/login?from=%2Ffeed%2Fwrite`, 비관리자는 `/`로 리다이렉트된다. 관리자는 `<PostEditor type="feed" />`를 받는다.
- 테스트 층: 단위

### FEED-6. 수정 화면은 관리자만, 피드 글만 연다

- 전제: 비로그인 / 관리자가 아닌 로그인 사용자 / 관리자.
- 행동: `/feed/edit/<slug>`를 연다.
- 결과: `requireAdmin("/feed")`를 먼저 부른다. 비로그인은 `/login?from=%2Ffeed`, 비관리자는 `/`로 리다이렉트된다. 관리자면 `getPostBySlugDirectly({ slug, user })` 뒤 `type !== "feed"`이면 `notFound()`. 피드면 `PostEditor type="feed"`에 `id`·`slug`·`title`·`content`·`visibility`·`imageKeys`를 초기값으로, `deleteSlug=<slug>`·`deleteRedirectTo="/feed"`를 넘긴다.
- 테스트 층: 단위

### FEED-7. 목록은 재검증 주기를 `REVALIDATE_PERIOD`로 선언하고 로딩 스켈레톤이 있다

- 전제: 없음.
- 행동: `app/feed/page.tsx`를 읽고, 목록 렌더링 중 `/feed`로 이동한다.
- 결과: `export const revalidate = 86400; // REVALIDATE_PERIOD`이며 값이 `REVALIDATE_PERIOD`와 같다. 쓰기·수정은 `dynamic = "force-dynamic"`이다. 로딩 중에는 `app/feed/loading.tsx`가 카드 스켈레톤 3장을 그린다.
- 테스트 층: 단위

## 4. 계약

| 경로 | 입력 | 접근 | 렌더링 설정 | 메타데이터 제목 |
| --- | --- | --- | --- | --- |
| `/feed` | 없음 | 모두. 관리자는 비공개 포함(피드는 원래 public만 저장된다) | `revalidate = 86400` | "피드" |
| `/feed/write` | 없음 | 관리자 | `force-dynamic` | "피드 쓰기" |
| `/feed/edit/[slug]` | `slug` | 관리자 | `force-dynamic` | `피드 수정: <slug>` |

`/feed/[slug]` 경로는 없다(Next 기본 404).

화면 상태:

- 로딩: `loading.tsx` 스켈레톤 3장.
- 빈 상태: "아직 피드가 없습니다."
- 카드(`FeedCard`, 클라이언트 컴포넌트): 머리(로고, "원스", UTC 기준 `YYYY-MM-DD`, 관리자 메뉴), 커버(`imageKeys[0]`을 `coverSrcFromImageKey`로 변환, 없으면 아이콘 자리), 버튼 줄, "좋아요 N개"·"댓글 N개", 본문 요약(`toExcerpt(content, 1000)`을 두 줄로 자르고 140자를 넘으면 "더 보기"). "더 보기"를 누르면 `HtmlContent isFeed`로 전체 본문과 "접기"를 보인다.

## 5. 데이터

없음 — posts 명세 참고.

## 6. 불변식

- 1 비공개 격리: 비관리자 목록은 `getPostsDirectly`의 public 조건과 RLS로 public 피드만 받는다.
- 2 관리자 판정: 쓰기·수정 화면은 `requireAdmin`, 관리자 UI는 `isAdminDb`로 정한다. 현행 위반은 [auth 명세](auth.md) §7.
- 3 글 타입 규칙: 수정 화면은 `type !== "feed"`이면 `notFound()`. 피드를 public으로 강제하는 일은 posts 명세가 한다.
- 4 쓰기는 관리자만: 쓰기·수정 화면 진입을 `requireAdmin`으로 막는다.
- 5 공개 캐시 정합성: 목록은 공개 태그 캐시를 쓰지 않고 세션 클라이언트로 조회한다. `revalidate`는 리터럴 86400에 `// REVALIDATE_PERIOD` 주석을 단다.

## 7. 미결·확인 필요

1. `/feed`는 `revalidate = 86400`을 내보내지만 `getCurrentUser`가 `headers()`를 읽어 요청마다 동적 렌더링된다. ISR은 사실상 동작하지 않는다(빌드 출력으로 확인 필요).
2. 목록은 공개 캐시(`getPublicPosts`) 대신 `getPostsDirectly`로 매 요청 모든 피드(본문 포함)를 받고, 페이지네이션이 없다. 피드가 늘면 응답이 커진다.
3. 불변식 3·4는 피드에 댓글이 있다고 하지만 피드 단건 경로(`/feed/[slug]`)도, 피드 댓글을 보거나 쓰는 화면도 없다. 카드의 댓글 버튼은 가짜 문구만 펼친다.
4. 카드의 좋아요 수("7개"/"8개")와 "방문객 피드가 좋네요 😊" 댓글은 하드코딩된 가짜 값이다. 방문자가 실제 반응으로 오해할 수 있다.
5. 수정 화면은 `getPostBySlugDirectly`의 예외를 잡지 않아 없는 slug면 `notFound()`가 아니라 오류 화면(500)이 된다. `requireAdmin("/feed")`의 `from`이 목록이라 로그인 후 수정 화면으로 돌아오지 않는다.
6. auth §7의 헤더 신뢰 문제에 기대는 곳: 쓰기·수정 화면의 `requireAdmin`, 목록의 "피드 쓰기"·카드 관리 메뉴 노출.

## 8. 관련 코드

- auth: `getCurrentUser`·`isAdminDb`·`requireAdmin`(`lib/server/admin.ts`).
- posts: `getPostsDirectly`·`getPostBySlugDirectly`(`lib/server/posts.ts`), `toExcerpt`(`lib/markdown.ts`), `Post` 타입(`lib/types.ts`), `PostEditor`, `PostActionMenu`, `HtmlContent`.
- images: `coverSrcFromImageKey`(`lib/image.ts`).
- site: `ButtonLink`·`Card`·`CardBody`·`Skeleton`(`app/_components/ui.tsx`), `cn`(`lib/utils.ts`).
