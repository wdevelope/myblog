# 명세: 댓글

- **상태:** 현행
- **ID 접두:** CMT
- **근거:** 현행 코드 역작성(2026-10-21)
- **코드 경로:** `lib/actions/comments.ts`, `app/_components/CommentForm.tsx`, `app/_components/CommentsThread.tsx`
- **승인:** 2026-10-21

## 1. 목적

로그인 사용자가 아티클(blog) 상세 화면에서 댓글과 한 단계 대댓글을 쓰고 본인 댓글을 지운다. 관리자는 모든 댓글을 지울 수 있다. 비로그인 방문자는 댓글을 보지도 쓰지도 못한다.

## 2. 범위

- 포함: 댓글 조회·작성·삭제 서버 액션(`getComments`·`createComment`·`deleteComment`), 댓글 스레드 UI(`CommentsThread`: 목록·대댓글·삭제), 단순 댓글 폼(`CommentForm`, 현재 미사용), `comments` 테이블 RLS.
- 제외(다른 명세 또는 하지 않는 것):
  - 상세 화면의 댓글 영역 배치와 비로그인 안내 문구(article 명세)
  - 상세 화면이 실제로 쓰는 조회 함수 `getCommentsDirectly`, 목록의 댓글 수(`comments(count)`)(posts 명세)
  - 관리자 판정 구현 `isAdminDb`(auth 명세)
  - 댓글 수정, 작성자 이름·프로필 표시, feed·diary 화면의 댓글 UI(없음)

## 3. 시나리오

### CMT-1. 비로그인 사용자는 댓글을 조회·작성·삭제할 수 없다

- 전제: `supabase.auth.getUser()`가 `user: null`을 돌려준다.
- 행동: `getComments("<postId>")`, `createComment({ postSlug: "s", content: "안녕" })`, `deleteComment("<commentId>")`를 호출한다.
- 결과: 셋 다 `{ success: false, error: "unauthorized" }`를 돌려주고 `posts`·`comments`를 조회·변경하지 않는다.
- 테스트 층: 단위

### CMT-2. 다이어리 글에는 관리자도 댓글을 조회·작성할 수 없다

- 전제: 로그인 사용자(관리자 포함). `posts` 조회가 `type: "diary"` 행을 돌려준다.
- 행동: `getComments(<글 id>)`, `createComment({ postSlug: <글 slug>, content: "안녕" })`를 호출한다.
- 결과: 둘 다 `{ success: false, error: "diary does not support comments" }`를 돌려주고 `comments`를 select·insert하지 않는다.
- 테스트 층: 단위

### CMT-3. 관리자가 아니면 private 글의 댓글을 조회·작성할 수 없다

- 전제: 로그인한 일반 사용자(`isAdminDb` → `false`). `posts` 조회가 `type: "blog"`, `visibility: "private"` 행을 돌려준다.
- 행동: `getComments(<글 id>)`, `createComment({ postSlug: <글 slug>, content: "안녕" })`를 호출한다.
- 결과: 둘 다 `{ success: false, error: "forbidden" }`를 돌려주고 `comments`를 select·insert하지 않는다. `isAdminDb` → `true`이면 통과한다.
- 테스트 층: 단위

### CMT-4. RLS가 일반 사용자의 비공개·다이어리·비공개 카테고리 글 댓글 접근을 막는다

- 전제: 댓글이 달린 글 세 개가 있다: private blog 글, diary 글, private 카테고리에 속한 public blog 글. 비교용으로 public feed 글과 public 카테고리의 public blog 글이 있다. 세션은 anon과 일반 사용자(`is_admin()` false)다.
- 행동: 세션 클라이언트로 각 글의 `comments`를 select하고, 일반 사용자 세션으로 각 글에 `author_id = auth.uid()`인 댓글을 insert한다. `author_id`를 다른 사용자 id로 넣는 insert도 시도한다.
- 결과: 앞의 세 글은 select 0행, insert는 RLS 위반 오류다(`comments_select_authenticated`·`comments_insert_authenticated`). 비교용 두 글은 일반 사용자가 select·insert할 수 있다. anon은 모든 글에서 0행이다. 다른 사용자 `author_id`로 하는 insert는 실패한다.
- 테스트 층: 통합(DB)

### CMT-5. 댓글은 로그인 사용자 본인 id로 저장된다

- 전제: 로그인 사용자 U. slug `s`인 public blog 글 P가 있다.
- 행동: `createComment({ postSlug: "s", content: "  안녕  " })`를 호출한다.
- 결과: `comments`에 `{ post_id: P.id, author_id: U.id, content: "안녕", parent_id: null }`을 insert하고 `{ success: true, comment: { id, postId: P.id, parentId: null, authorId: U.id, content: "안녕", createdAt } }`를 돌려준다. 입력으로 작성자를 받지 않는다. `revalidateTag`·`revalidatePath`를 호출하지 않는다.
- 테스트 층: 단위

### CMT-6. 대댓글은 같은 글의 최상위 댓글에만 달 수 있다

- 전제: 글 A에 최상위 댓글 R과 R의 대댓글 RR이 있다. 글 B에 최상위 댓글 X가 있다.
- 행동: `createComment({ postSlug: <A slug>, content: "답글", parentId })`를 `parentId`를 RR, X, 없는 id, R로 바꿔 가며 호출한다.
- 결과: RR이면 `{ success: false, error: "nested replies are not supported" }`, X이면 `{ success: false, error: "invalid parent comment" }`, 없는 id이면 `{ success: false, error: "parent comment not found" }`이고 insert하지 않는다. R이면 `parent_id: R.id`로 저장한다.
- 테스트 층: 단위

### CMT-7. 댓글 삭제는 작성자 본인 또는 관리자만 할 수 있다

- 전제: 댓글 C의 `author_id`는 U1이다.
- 행동: `deleteComment(C.id)`를 일반 사용자 U2, 작성자 U1, 관리자(`isAdminDb` → `true`) 세션으로 각각 호출한다.
- 결과: U2는 `{ success: false, error: "forbidden" }`이고 delete를 호출하지 않는다. U1과 관리자는 `comments.delete().eq("id", C.id)`를 호출하고 `{ success: true }`를 받는다. 댓글이 조회되지 않으면 `{ success: false, error: "not_found" }`다.
- 테스트 층: 단위

### CMT-8. 부모 댓글을 지우면 대댓글도 함께 지워진다

- 전제: 최상위 댓글 R과 대댓글 RR1·RR2(다른 사용자가 작성)가 있다.
- 행동: R 작성자 세션으로 R을 삭제한다.
- 결과: R·RR1·RR2가 모두 `comments`에서 사라진다(`parent_id` FK `on delete cascade`). 같은 글의 다른 댓글은 남는다.
- 테스트 층: 통합(DB)

### CMT-9. 대댓글은 부모 댓글 아래 입력 순서대로 묶이고 대댓글 버튼은 최상위 댓글에만 있다

- 전제: `comments` prop = `[R1, R2, RR1(parentId R1), RR2(parentId R1)]`(`created_at` 오름차순).
- 행동: `CommentsThread`를 렌더하고 R1의 "대댓글" 버튼을 두 번 누른다.
- 결과: 제목은 "댓글 4개"다. R1, R1 아래 RR1·RR2, R2 순서로 보인다. "대댓글" 버튼은 R1·R2에만 있다. 첫 클릭에 R1 아래 placeholder "대댓글을 작성해주세요…" 입력창이 열리고 두 번째 클릭에 닫힌다. `comments`가 비어 있으면 "아직 작성된 댓글이 없습니다."를 보여 준다.
- 테스트 층: 컴포넌트(jsdom)

### CMT-10. 삭제 버튼은 작성자 본인과 관리자에게만 보인다

- 전제: U1이 쓴 최상위 댓글과 U2가 쓴 최상위 댓글·대댓글이 있다.
- 행동: `currentUserId: U1, isAdmin: false`로 렌더하고, 이어서 `isAdmin: true`로 렌더한다.
- 결과: 첫 렌더에서 "삭제" 버튼은 U1 댓글에만 있다. `isAdmin: true`이면 모든 댓글과 대댓글에 있다.
- 테스트 층: 컴포넌트(jsdom)

### CMT-11. 삭제는 확인을 거치고 결과에 따라 새로 고치거나 오류를 알린다

- 전제: "삭제" 버튼이 보이는 댓글 C.
- 행동: "삭제"를 누르고 확인 창을 취소한다. 다시 눌러 수락한다(액션 실패·성공 각각).
- 결과: 확인 문구는 "정말 이 댓글을 삭제하시겠습니까?\n대댓글이 있는 경우 함께 삭제됩니다."다. 취소하면 `deleteComment`를 호출하지 않는다. 실패하면 `alert(<result.error>)`, 성공하면 `router.refresh()`를 호출한다.
- 테스트 층: 컴포넌트(jsdom)

### CMT-12. 댓글 등록 성공 시 입력창을 비우고 새로 고치며 실패 시 서버 오류를 보여 준다

- 전제: `canWrite: true`.
- 행동: 공백만 입력하고 "등록"을 누른다. "안녕"을 입력하고 "등록"을 누른다(액션 성공·실패 각각). `canWrite: false`로도 렌더한다.
- 결과: 공백만이면 `createComment`를 호출하지 않는다. 처리 중에는 입력창과 버튼이 비활성이다. 성공하면 입력창이 비고 열린 대댓글 입력창이 닫히며 `router.refresh()`를 호출한다. 실패하면 입력값을 유지하고 입력창 아래에 서버가 준 `error` 문자열(예: "forbidden")을 보여 준다. `canWrite: false`이면 입력창과 버튼이 처음부터 비활성이다.
- 테스트 층: 컴포넌트(jsdom)

## 4. 계약

서버 액션(`lib/actions/comments.ts`, `"use server"`). 세 액션 모두 세션 클라이언트(`createSupabaseServerClient`)만 쓰고 service role을 쓰지 않는다. 캐시 무효화(`revalidateTag`·`revalidatePath`)를 하지 않으며, 화면 갱신은 클라이언트의 `router.refresh()`가 맡는다.

| 액션 | 인자 | 성공 | 실패 `error` | 호출 권한 |
| --- | --- | --- | --- | --- |
| `getComments` | `postId: string` | `{ success: true, comments: Comment[] }`(`created_at` 오름차순, 최상위·대댓글 평탄 목록) | `"postId is required"`, `"unauthorized"`, `"not_found"`, `"diary does not support comments"`, `"forbidden"`, `"DB Error: <message>"` | 로그인 사용자. private 글은 관리자. 현재 호출처 없음 |
| `createComment` | `{ postSlug: string; content: string; parentId?: string }` | `{ success: true, comment: Comment }` | `"unauthorized"`, `"postSlug is required"`, `"내용을 입력해주세요."`, `"not_found"`, `"diary does not support comments"`, `"forbidden"`, `"parent comment not found"`, `"invalid parent comment"`, `"nested replies are not supported"`, `"DB Error: <message>"` | 로그인 사용자. private 글은 관리자 |
| `deleteComment` | `commentId: string` | `{ success: true }` | `"commentId is required"`, `"unauthorized"`, `"not_found"`, `"forbidden"`, `"DB Error: <message>"` | 작성자 본인 또는 관리자 |

- `Comment` = `{ id, postId, parentId?, authorId?, content, createdAt }`(`lib/types.ts`).
- 검사 순서: 인증 → 입력 → 글 조회(`not_found`) → diary → private(관리자 아님) → 부모 댓글.

화면 컴포넌트:

- `CommentsThread`(`"use client"`). props `{ postSlug, comments, canWrite, currentUserId?, isAdmin? }`.
  - 머리: "댓글 N개"(대댓글 포함 개수). 최상위 입력창 placeholder "댓글을 작성해주세요", 버튼 "등록".
  - 빈 목록: "아직 작성된 댓글이 없습니다."
  - 항목: 아바타 `/logo.png`, 작성자 "사용자 <authorId 앞 6자>"(없으면 "사용자"), 상대 시간 "방금 전"·"N분 전"·"N시간 전"·"N일 전", 본문(줄바꿈 유지).
  - 처리 중: 입력창·버튼 비활성. 오류: 입력창 아래 빨간 문구. 삭제 실패: `alert`.
  - 렌더 위치: `/article/[slug]` 로그인 사용자에게만(article 명세).
- `CommentForm`(`"use client"`). props `{ postSlug }`. 최상위 댓글 입력창("댓글", placeholder "댓글을 입력하세요…", 버튼 "등록"). 성공 시 입력창을 비우고 `router.refresh()`, 실패 시 `result.error`를 빨간 문구로 보여 준다. 현재 어느 화면도 import하지 않는다.

## 5. 데이터

- 기본 스키마(`create table posts/comments/users`, `is_admin()` 함수)는 저장소 마이그레이션에 없다. 아래는 저장소에 있는 마이그레이션 기준이다.
- `public.comments`
  - 쓰는 열: `id`, `post_id`, `parent_id`, `author_id`, `content`, `created_at`.
  - `parent_id uuid null references comments(id) on delete cascade`(`20260101193000_add_comment_parent_id.sql`).
  - 인덱스: `comments_post_parent_created_idx (post_id, parent_id, created_at)`(같은 파일), `comments_post_id_idx (post_id)`(`20260404161000_perf_indexes.sql`).
  - RLS(`20260102121000_add_category_visibility_and_sort_order.sql`):
    - `comments_select_authenticated`: `for select to authenticated`. 글이 diary가 아니고, (public 또는 `is_admin()`)이고, blog면 카테고리가 public일 때.
    - `comments_insert_authenticated`: `for insert to authenticated`, `with check (author_id = auth.uid())`와 위와 같은 글 조건.
    - anon용 SELECT 정책과 DELETE 정책은 저장소에 없다.
  - `post_id` FK의 `on delete` 동작은 기본 스키마에 있어 확인할 수 없다.
- `public.posts`: `id`, `slug`, `type`, `visibility`를 읽는다. RLS `posts_select_public`(같은 마이그레이션)이 일반 사용자에게 private 글·diary·비공개 카테고리 blog 글을 숨긴다.
- `public.users.is_admin`: `isAdminDb`가 마지막 단계에서 읽는다(auth 명세).
- Storage: 없음.

## 6. 불변식

번호는 [불변식](../INVARIANTS.md) 문서의 항목 번호다.

- **1. 비공개 격리:** 세션 클라이언트만 써서 RLS(`comments_select_authenticated`·`comments_insert_authenticated`·`posts_select_public`)가 1차로 막는다. 코드는 private 글이면 비관리자에게 `"forbidden"`을 돌려준다(2차). 비로그인은 `"unauthorized"`이고 상세 화면은 비로그인에게 댓글을 렌더하지 않는다.
- **2. 관리자 판정:** 사용자는 `auth.getUser()`로 확인하지만 관리자 여부는 `isAdminDb(auth.user)`가 요청 헤더와 `user_metadata`도 믿는다. 현행 위반이다(§7).
- **3. 글 타입 규칙:** diary면 조회·작성 모두 `"diary does not support comments"`이고 RLS도 `p.type <> 'diary'`로 막는다. diary 화면에는 댓글 UI가 없다.
- **4. 댓글은 로그인 사용자:** 작성은 로그인 필수이고 `author_id`는 세션 사용자 id로만 채운다(RLS `author_id = auth.uid()`). 삭제는 작성자 또는 관리자만 허용한다. 대댓글은 서버가 `"nested replies are not supported"`로, UI가 최상위 댓글에만 "대댓글" 버튼을 두어 한 단계로 묶는다.
- **5. 공개 캐시:** 댓글 액션은 공개 캐시에 쓰지 않는다. 공개 목록 캐시에는 댓글 수만 들어가며 댓글 액션은 이를 무효화하지 않는다(§7).
- **6. 비밀값:** service role을 쓰지 않는다. 클라이언트 컴포넌트는 `"use server"` 액션과 `Comment` 타입만 import한다.

## 7. 미결·확인 필요

- 관리자 판정 위조 영향([auth 명세](auth.md) §7): 세 액션은 `auth.getUser()`로 실제 사용자를 확인하므로 비로그인 우회는 없다. 그러나 `isAdminDb(auth.user)`가 `x-user-is-admin: true` 요청 헤더와 사용자가 스스로 바꿀 수 있는 `user_metadata.is_admin`을 믿으므로 로그인한 일반 사용자가 코드의 관리자 분기를 통과할 수 있다. `getComments`·`createComment`의 private 검사와 `deleteComment`의 작성자 검사가 무력화된다. 실제 차단은 RLS에 달려 있다. 조회·작성은 기본 스키마의 `is_admin()`이 DB 기준이면 막힌다. 삭제는 저장소에 DELETE 정책이 없어 판단할 수 없다.
- 댓글 DELETE RLS 정책이 마이그레이션에 없다. `tasklist.md`에는 "댓글 삭제 권한(RLS) 정책 추가"가 완료로 체크되어 있어 DB에만 적용된 것으로 보인다. 또 `deleteComment`는 삭제된 행 수를 확인하지 않아 RLS가 막아도 `{ success: true }`를 돌려준다(새로 고쳐도 댓글이 그대로 남는다).
- 코드와 RLS 결과 불일치: `posts_select_public`이 일반 사용자에게 private 글을 숨기므로 실제 DB에서는 `"forbidden"` 대신 `"not_found"`가 나온다. `"forbidden"` 분기는 기본 스키마에 일반 사용자에게 private 글을 보여 주는 정책이 있을 때만 닿는다.
- 비공개 카테고리 글 댓글: `comments_select_authenticated`·`comments_insert_authenticated`의 카테고리 조건에는 `is_admin()` 예외가 없다. 기본 스키마에 별도 관리자 정책이 없다면 관리자도 private 카테고리 blog 글의 댓글을 조회·작성할 수 없고, 삭제도 조회 단계에서 `"not_found"`가 된다. 상세 화면에서 관리자에게 글은 보이지만 댓글은 0개로 보일 수 있다.
- 댓글 수 캐시: 댓글 액션이 캐시를 무효화하지 않아 공개 목록의 댓글 수(`getPublicPosts`의 `comments(count)`, fetch `revalidate` 60초)가 늦게 반영된다. 또 이 조회는 anon 키로 하는데 저장소의 comments SELECT 정책은 authenticated 전용이다. 기본 스키마에 anon 정책이 없다면 공개 목록의 댓글 수는 항상 0이다.
- feed 댓글 UI 없음: 액션은 feed 글 댓글을 허용하지만 feed에는 상세 화면(`app/feed/[slug]/`는 빈 폴더)도 댓글 UI도 없다. `FeedCard`의 댓글 버튼은 하드코딩된 더미 댓글만 펼친다. 제품 규칙("blog/feed 댓글 지원")과 어긋난다.
- 미사용 코드: `getComments`(호출처 없음, 상세 화면은 `getCommentsDirectly` 사용)와 `CommentForm`(import하는 곳 없음). `getComments`와 `getCommentsDirectly`는 같은 규칙을 중복 구현하면서 실패 처리가 다르다(오류 객체 반환 대 빈 배열·throw).
- 오류 문자열 노출: `"DB Error: <message>"`와 영문 내부 코드(`"forbidden"`, `"nested replies are not supported"` 등)를 그대로 입력창 아래 문구나 `alert`로 보여 준다.
- 본문 길이 제한이 없다(trim 후 비었는지만 본다). DB 제약은 기본 스키마에 있어 확인할 수 없다.
- 작성자 표시: `author_id` 전체 UUID가 로그인 사용자 모두에게 props로 내려가고 화면은 "사용자 <앞 6자>"만 보여 준다.
- `README.md`의 `GET/POST /api/comments`는 존재하지 않는다(서버 액션으로 대체됨).

## 8. 관련 코드

- `lib/server/posts.ts` `getCommentsDirectly`(posts 명세): `/article/[slug]`가 쓰는 실제 댓글 조회 경로다. 규칙은 `getComments`와 같지만 diary·private(비관리자)면 빈 배열을 돌려주고 오류는 throw한다.
- `lib/server/posts.ts` `mapPost`·`getPostsDirectly`·`getPostBySlugDirectly`, `lib/server/publicPosts.ts` `getPublicPosts`(posts 명세): `comments(count)`로 `commentCount`를 채운다.
- `lib/types.ts` `Comment`(posts 명세).
- `app/article/[slug]/page.tsx`(article 명세): 로그인 사용자에게 `CommentsThread`를 `canWrite`, `currentUserId={user.id}`, `isAdmin`과 함께 렌더한다. 비로그인에게는 "로그인 후 댓글을 확인/작성할 수 있어요."와 `/login?from=/article/<slug>` 링크를 보여 준다.
- `app/article/page.tsx`(article 명세), `app/feed/FeedCard.tsx`(feed 명세): 목록 카드에 댓글 수를 보여 준다. `FeedCard`의 댓글 버튼은 더미 댓글 애니메이션이다.
- `lib/server/admin.ts` `isAdminDb`, `lib/supabase/server.ts` `createSupabaseServerClient`(auth 명세).
