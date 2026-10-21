# 명세: 다이어리 화면

- **상태:** 현행
- **ID 접두:** DIARY
- **근거:** 현행 코드 역작성(2026-10-21)
- **코드 경로:** `app/diary/`
- **승인:** 2026-10-21

## 1. 목적

관리자의 일기(`diary` 타입)를 달력과 날짜별 목록으로 보여 준다. 방문자는 비공개 일기가 있다는 사실과 날짜만 보고 제목·본문은 보지 못한다. 관리자는 모든 일기를 읽고 날짜를 지정해 쓰고 고친다. 댓글은 없다.

## 2. 범위

- 포함: `/diary` 목록(`DiaryIndexClient`: 달력·월 선택·날짜 필터·클라이언트 페이지네이션·URL과 sessionStorage 동기화), `/diary/[slug]` 상세, `/diary/write`·`/diary/edit/[slug]` 진입 권한과 에디터 초기값, 목록 로딩 스켈레톤.
- 제외: 다이어리 목록 가림 처리와 작성일 저장(posts), 이미지 표시(images), 관리자 판정(auth). 다이어리 댓글은 만들지 않는다.

## 3. 시나리오

### DIARY-1. 관리자가 아니면 목록은 비공개 일기 제목을 "일기"로 가리고 본문을 비운다

- 전제: 비로그인 또는 관리자가 아닌 로그인 사용자. public·private 다이어리가 섞여 있다.
- 행동: `/diary`를 연다.
- 결과: `getPostsDirectly({ type: "diary", user })`가 service role로 모든 다이어리를 받되 `private` 글의 `title`은 "일기", 모든 글의 `content`는 `""`, `imageKeys`는 `[]`로 돌려준다. 이 값이 그대로 `DiaryIndexClient`의 `posts`로 넘어간다.
- 테스트 층: 통합(DB)

### DIARY-2. 관리자가 아니면 비공개 항목은 링크 없이 자물쇠만 보인다

- 전제: 비관리자. 목록에 public 글 하나, private 글 하나.
- 행동: 목록을 렌더링한다.
- 결과: public 글 제목은 `/diary/<slug>` 링크다. private 글은 "일기" 제목을 링크 없이 보이고 옆에 자물쇠 아이콘을 둔다. `PostActionMenu`와 "다이어리 쓰기"는 없다.
- 테스트 층: 컴포넌트(jsdom)

### DIARY-3. 관리자는 모든 일기와 쓰기·수정·삭제 메뉴를 본다

- 전제: 관리자.
- 행동: `/diary`를 연다.
- 결과: `getPostsDirectly`가 세션 클라이언트로 모든 다이어리(본문 포함)를 돌려준다. private 글도 제목이 그대로이고 `/diary/<slug>`로 링크된다. 상단 "다이어리 쓰기", 달력 아래 "오늘은 어떤 하루였나요?" 카드, 빈 목록의 작성 버튼이 쓰기 화면으로 간다. 항목마다 `PostActionMenu`(`editHref="/diary/edit/<slug>"`, `deleteRedirectTo="/diary"`, `ariaLabel="다이어리 더보기"`)를 보인다.
- 테스트 층: 컴포넌트(jsdom)

### DIARY-4. 날짜를 고르면 KST 날짜가 같은 일기만 보이고 쓰기 링크에 날짜가 붙는다

- 전제: 목록에 여러 날짜의 일기가 있다.
- 행동: 달력에서 날짜 `YYYY-MM-DD`를 누른다.
- 결과: `createdAt`을 Asia/Seoul 기준 `YYYY-MM-DD`로 바꾼 값이 같은 글만 보인다. 없으면 "선택한 날짜에 작성한 다이어리가 없습니다."를 보인다. 관리자 쓰기 링크는 `/diary/write?date=YYYY-MM-DD`가 되고 카드 문구는 "YYYY.MM.DD 작성하기"다. "전체 보기"가 나타나고, 같은 날짜를 다시 누르거나 "전체 보기"를 누르면 선택이 풀린다. 일기가 있는 날은 달력에서 강조된다.
- 테스트 층: 컴포넌트(jsdom)

### DIARY-5. 날짜를 고르지 않으면 보고 있는 달의 일기만 10개씩 보인다

- 전제: 날짜를 고르지 않았다.
- 행동: 달력에서 달을 넘기거나 월 보기에서 달을 고른다.
- 결과: 브라우저 로컬 시간 기준으로 그 달 1일 0시부터 말일 23:59:59.999 사이 글만 최신순으로 보인다. 10개를 넘으면 `이전`·`<page> / <총 페이지>`·`다음` 버튼으로 나눈다(서버 요청 없음). 달을 바꾸면 1페이지·날짜 선택 없음으로 돌아간다. 글이 없으면 "아직 다이어리가 없습니다."를 보인다.
- 테스트 층: 컴포넌트(jsdom)

### DIARY-6. 보고 있는 달과 날짜를 URL과 sessionStorage에 남긴다

- 전제: 없음.
- 행동: 달이나 날짜를 바꾼 뒤 새로 고치거나 다른 화면에서 돌아온다.
- 결과: 바뀔 때마다 `router.replace("/diary?year=<Y>&month=<M>[&date=<YYYY-MM-DD>]", { scroll: false })`를 하고 sessionStorage `diary_view_ym`(`YYYY-MM`)·`diary_selected_date`를 쓴다. 처음 열 때 `year`·`month` 쿼리가 있으면 그것을, 없으면 sessionStorage 값을 복원한다.
- 테스트 층: 컴포넌트(jsdom)

### DIARY-7. 다이어리가 아닌 글의 slug면 상세는 404다

- 전제: slug가 읽을 수 있는 `blog`·`feed` 글이다.
- 행동: `/diary/<slug>`를 연다.
- 결과: `post.type !== "diary"`이므로 `notFound()`.
- 테스트 층: 단위

### DIARY-8. 읽을 수 없는 일기 상세는 "비공개 다이어리"로 본문 없이 보인다

- 전제: 비관리자이고 slug가 private 다이어리이거나, RLS로 보이지 않는 글이거나, 없는 글이다.
- 행동: `/diary/<slug>`를 연다.
- 결과: `getPostBySlugDirectly`가 던진 404(또는 403)를 잡아 `post = null`로 둔다. `notFound()`를 부르지 않고 제목 "비공개 다이어리"를 보인다. 날짜는 비고, 본문·이미지·관리 메뉴는 없다.
- 테스트 층: 단위

### DIARY-9. 관리자는 상세에서 본문과 수정·삭제 메뉴를 본다

- 전제: 관리자. slug가 다이어리 글이다(공개 범위 무관).
- 행동: `/diary/<slug>`를 연다.
- 결과: 제목·`ko-KR` 날짜·공개 범위 아이콘·`HtmlContent` 본문·`PostImages`를 보이고 `PostActionMenu`(`editHref="/diary/edit/<slug>"`, `deleteRedirectTo="/diary"`, `ariaLabel="다이어리 더보기"`)를 보인다.
- 테스트 층: 단위

### DIARY-10. 다이어리 상세에는 댓글 영역이 없다

- 전제: 누구든.
- 행동: `/diary/<slug>`를 연다.
- 결과: `getCommentsDirectly`를 부르지 않고 `CommentsThread`·댓글 입력·로그인 유도 문구를 렌더링하지 않는다.
- 테스트 층: 단위

### DIARY-11. 쓰기 화면은 관리자만 열고 `date` 쿼리를 작성일로 넘긴다

- 전제: 비로그인 / 관리자가 아닌 로그인 사용자 / 관리자.
- 행동: `/diary/write?date=2026-10-21`을 연다.
- 결과: `requireAdmin("/diary/write")`를 먼저 부른다. 비로그인은 `/login?from=%2Fdiary%2Fwrite`, 비관리자는 `/`로 리다이렉트된다. 관리자는 `PostEditor type="diary" defaultVisibility="private" createdAtYmd="2026-10-21"`을 받는다. `date`가 `^\d{4}-\d{2}-\d{2}$`에 맞지 않거나 없으면 `createdAtYmd`는 `undefined`다.
- 테스트 층: 단위

### DIARY-12. 수정 화면은 관리자만, 다이어리 글만 연다

- 전제: 비로그인 / 관리자가 아닌 로그인 사용자 / 관리자.
- 행동: `/diary/edit/<slug>`를 연다.
- 결과: `requireAdmin("/diary")`를 먼저 부른다. 비로그인은 `/login?from=%2Fdiary`, 비관리자는 `/`로 리다이렉트된다. 관리자면 `getPostBySlugDirectly({ slug, user })` 뒤 `type !== "diary"`이면 `notFound()`. 다이어리면 `PostEditor type="diary" defaultVisibility="private"`에 `id`·`slug`·`title`·`content`·`visibility`·`imageKeys`를 초기값으로, `deleteRedirectTo="/diary"`를 넘긴다.
- 테스트 층: 단위

### DIARY-13. 목록·상세는 재검증 주기를 `REVALIDATE_PERIOD`로 선언하고 목록에 로딩 스켈레톤이 있다

- 전제: 없음.
- 행동: `app/diary/page.tsx`·`app/diary/[slug]/page.tsx`를 읽고, 목록 렌더링 중 `/diary`로 이동한다.
- 결과: 두 모듈 모두 `export const revalidate = 86400; // REVALIDATE_PERIOD`이며 값이 `REVALIDATE_PERIOD`와 같다. 쓰기·수정은 `dynamic = "force-dynamic"`이다. 로딩 중에는 `app/diary/loading.tsx`가 달력 스켈레톤과 목록 스켈레톤 5줄을 그린다.
- 테스트 층: 단위

## 4. 계약

| 경로 | 입력 | 접근 | 렌더링 설정 | 메타데이터 제목 |
| --- | --- | --- | --- | --- |
| `/diary` | `?year=<Y>&month=<1-12>&date=<YYYY-MM-DD>`(클라이언트만 읽는다) | 모두. 비관리자는 가린 목록 | `revalidate = 86400` | "다이어리" |
| `/diary/[slug]` | `slug` | 모두. 본문은 읽을 수 있는 글만 | `revalidate = 86400` | 없음(루트 기본값) |
| `/diary/write` | `?date=<YYYY-MM-DD>` | 관리자 | `force-dynamic` | "다이어리 쓰기" |
| `/diary/edit/[slug]` | `slug` | 관리자 | `force-dynamic` | `다이어리 수정: <slug>` |

화면 상태:

- 목록 로딩: `loading.tsx` 스켈레톤.
- 목록 빈 상태: 날짜 선택 시 "선택한 날짜에 작성한 다이어리가 없습니다.", 아니면 "아직 다이어리가 없습니다." 관리자에게는 "선택한 날짜에 다이어리 작성하기" 또는 "오늘 다이어리 작성하기" 버튼.
- 목록 항목: 월·일 큰 표시, 제목(링크 여부는 DIARY-2·3), 자물쇠(private), `YYYY년 M월 D일 (요일)`, 관리자 메뉴.
- 달력: 일 보기(7×6 격자, 일기 있는 날 강조, 선택한 날 테두리)와 월 보기(12개월). 화살표는 일 보기에서 한 달, 월 보기에서 한 해를 옮긴다.
- 상세: "← 목록으로"(`BackButton fallbackHref="/diary"`), "w-life / 다이어리" 경로, 제목 또는 "비공개 다이어리", 작성자 "원스", 날짜, "조회수 N회", 공개 범위 아이콘, 본문·이미지(읽을 수 있을 때만).

## 5. 데이터

없음 — posts 명세 참고.

## 6. 불변식

- 1 비공개 격리: 비관리자 목록은 posts의 가림 처리로 private 제목을 "일기"로, 본문을 `""`로 받고, private 항목에 상세 링크를 걸지 않는다. 비관리자 상세는 읽을 수 없는 글의 제목·본문을 내보내지 않는다.
- 2 관리자 판정: 쓰기·수정 화면은 `requireAdmin`, 관리자 UI와 목록 분기는 `isAdminDb`로 정한다. 현행 위반은 [auth 명세](auth.md) §7.
- 3 글 타입 규칙: 상세·수정은 읽은 글이 `diary`가 아니면 `notFound()`. 상세에 댓글 조회·작성이 없다.
- 4 쓰기는 관리자만: 쓰기·수정 화면 진입을 `requireAdmin`으로 막는다.
- 5 공개 캐시 정합성: 다이어리는 공개 태그 캐시를 쓰지 않는다. `revalidate`는 리터럴 86400에 `// REVALIDATE_PERIOD` 주석을 단다.

## 7. 미결·확인 필요

1. `/diary`·`/diary/[slug]`는 `revalidate = 86400`을 내보내지만 `getCurrentUser`가 `headers()`를 읽어 요청마다 동적 렌더링된다. ISR은 사실상 동작하지 않는다(빌드 출력으로 확인 필요). 정적으로 바꾸면 관리자 응답(전체 본문)이 공유 캐시에 들어갈 수 있다.
2. 비관리자는 public 다이어리도 읽지 못할 수 있다. 저장소 마이그레이션의 `posts_select_public`은 `type <> 'diary'`를 요구하므로, 기본 스키마에 다른 허용 정책이 없다면 상세는 public 다이어리도 "비공개 다이어리"로 보인다. 목록은 public 다이어리에 상세 링크를 건다(기본 스키마가 저장소에 없어 확인 필요).
3. 상세는 없는 slug와 읽을 수 없는 글을 404가 아니라 200 "비공개 다이어리" 화면으로 응답한다. 다른 타입의 비공개 글 slug도 같은 화면이 되어 "경로 타입 ≠ 글 타입이면 404" 규칙의 예외가 된다. 이때 공개 아이콘(지구본)과 "조회수 0회"가 보여 공개 글처럼 보인다.
4. 날짜 경계: 달력 강조와 날짜 필터는 Asia/Seoul 기준인데, 날짜를 고르지 않았을 때의 달 필터와 항목의 월·일·요일 표시는 브라우저 로컬 시간 기준이다. KST가 아닌 브라우저에서는 월초·월말 일기가 다른 달 목록에 나오거나 달력 강조와 어긋난다.
5. 비관리자 목록의 RSC 응답에는 private 일기의 `id`·`slug`·작성 시각·`thumbnailImageKey`·댓글 수가 그대로 담긴다. 제목·본문은 가려지지만 나머지 메타데이터는 노출된다. 불변식 1이 이를 허용하는지 확인 필요.
6. 수정 화면은 `getPostBySlugDirectly`의 예외를 잡지 않아 없는 slug면 `notFound()`가 아니라 오류 화면(500)이 된다. `requireAdmin("/diary")`의 `from`이 목록이라 로그인 후 수정 화면으로 돌아오지 않는다.
7. 날짜 필터·페이지는 클라이언트에서만 계산하므로, 목록은 매 요청 모든 다이어리를 내려받는다(관리자는 본문 포함).
8. 조회수는 늘리는 코드가 없어 항상 "조회수 0회"다(posts §7).
9. auth §7의 헤더 신뢰 문제에 기대는 곳: 쓰기·수정 화면의 `requireAdmin`, 목록·상세의 관리자 UI 노출과 목록 분기 선택.

## 8. 관련 코드

- auth: `getCurrentUser`·`isAdminDb`·`requireAdmin`(`lib/server/admin.ts`).
- posts: `getPostsDirectly`(비관리자 다이어리 가림 처리 포함)·`getPostBySlugDirectly`(`lib/server/posts.ts`), `PostEditor`(`defaultVisibility`·`createdAtYmd`), `PostActionMenu`, `HtmlContent`.
- images: `PostImages`.
- site: `BackButton`, `Skeleton`(`app/_components/ui.tsx`).
