# 명세: 카테고리

- **상태:** 현행
- **ID 접두:** CAT
- **근거:** 현행 코드 역작성(2026-10-21)
- **코드 경로:** `lib/actions/categories.ts`, `app/article/CategorySelect.tsx`, `app/article/CategorySettingsModal.tsx`
- **승인:** 2026-10-21

## 1. 목적

관리자가 아티클(blog) 글을 묶는 카테고리를 만들고 이름·공개 범위·순서를 바꾸며, 글을 다른 카테고리로 옮긴 뒤 삭제한다. 방문자는 공개 카테고리만 보고, 모바일에서는 선택 상자로 카테고리를 골라 목록을 거른다.

## 2. 범위

- 포함: 카테고리 서버 액션 5개(`getCategories`·`createCategory`·`updateCategory`·`deleteCategory`·`reorderCategory`), 카테고리 관리 모달(`CategorySettingsModal`), 모바일 카테고리 선택(`CategorySelect`), `categories` RLS와 카테고리 공개 범위가 글·댓글 조회에 주는 영향.
- 제외(다른 명세 또는 하지 않는 것):
  - 아티클 목록·카테고리 사이드바 렌더링과 `?category=` 필터, `/article/category/[slug]` 리다이렉트(article 명세)
  - 글 저장 시 카테고리 필수 검증과 없는 카테고리 자동 생성, 카테고리별 공개 글 수 `getPublicPostCounts`(posts 명세)
  - 관리자 판정 구현 `requireAdmin`·`isAdminDb`(auth 명세)
  - feed·diary 카테고리(없음. 카테고리는 blog 전용이다)

## 3. 시나리오

### CAT-1. 관리자가 아니면 카테고리를 생성·수정·삭제·정렬할 수 없다

- 전제: (a) 비로그인 사용자, (b) 로그인한 일반 사용자.
- 행동: `createCategory("개발")`, `updateCategory("개발", { visibility: "private" })`, `deleteCategory("개발")`, `reorderCategory("개발", "up")`을 호출한다.
- 결과: 네 액션 모두 첫 줄 `requireAdmin("/")`이 (a)는 `/login?from=%2F`, (b)는 `/`로 redirect한다. service role 클라이언트를 만들지 않고 DB를 바꾸지 않으며 캐시도 무효화하지 않는다.
- 테스트 층: 단위

### CAT-2. 카테고리별 사용 수(inUse)는 관리자에게만 준다

- 전제: 세션 클라이언트의 `categories` 조회가 `[{ slug: "a", visibility: "public", sort_order: 1 }]`을 돌려준다. a에 blog 글이 2개(그중 private 1개) 있다.
- 행동: 비관리자(비로그인 포함)와 관리자가 각각 `getCategories()`를 호출한다.
- 결과: 비관리자는 `{ success: true, categories: [{ slug: "a", visibility: "public", sortOrder: 1 }] }`을 받고(`inUse` 없음) service role 클라이언트를 만들지 않는다. 관리자는 service role로 `posts`(`type = "blog"`, `category_slug` not null)를 세어 `inUse: 2`(private 글 포함)를 받는다. 글이 없는 카테고리는 `inUse: 0`이다. 목록은 `sort_order` 오름차순, 같으면 `slug` 오름차순으로 요청한다.
- 테스트 층: 단위

### CAT-3. 관리자가 아니면 공개 카테고리만 조회된다

- 전제: public 카테고리 a와 private 카테고리 b가 있다.
- 행동: anon·일반 사용자·관리자 세션으로 `categories`를 select한다.
- 결과: anon과 일반 사용자는 a만, 관리자(`is_admin()` true)는 a·b를 받는다(`categories_select`).
- 테스트 층: 통합(DB)

### CAT-4. 비공개 카테고리의 blog 글은 public이어도 관리자가 아니면 보이지 않는다

- 전제: private 카테고리 b에 `visibility = 'public'`인 blog 글 P가 있다.
- 행동: anon·일반 사용자 세션으로 `posts`를 select한다(`getPublicPosts`의 anon REST 조회와 상세 화면의 세션 조회 경로). 이어서 b를 public으로 바꾸고 다시 조회한다.
- 결과: P는 0행이다(`posts_select_public`의 카테고리 조건). 그래서 `/article` 공개 목록에서 빠지고 `/article/<P slug>`는 404다. b를 public으로 바꾸면 P가 조회된다.
- 테스트 층: 통합(DB)

### CAT-5. 새 카테고리는 공개 상태로 맨 뒤에 생기고 blog 공개 캐시를 무효화한다

- 전제: 관리자. 기존 최대 `sort_order`가 3이고 "개발"은 없다.
- 행동: `createCategory(" 개발 ")`을 호출한다.
- 결과: service role로 `{ slug: "개발", visibility: "public", sort_order: 4 }`를 insert하고 `revalidateTag("posts:public:blog", "default")`, `revalidatePath("/article")`을 호출한 뒤 `{ success: true, slug: "개발" }`을 돌려준다. 카테고리가 하나도 없으면 `sort_order`는 1이다.
- 테스트 층: 단위

### CAT-6. 이미 있는 이름으로 만들거나 바꾸면 conflict로 거부한다

- 전제: 관리자. "개발"과 "일상"이 있다.
- 행동: `createCategory("개발")`, `updateCategory("일상", { slug: "개발" })`을 호출한다.
- 결과: 둘 다 `{ success: false, error: "conflict" }`를 돌려주고 insert·update·캐시 무효화를 하지 않는다. 모달은 toast "이미 존재하는 카테고리예요."를 띄운다.
- 테스트 층: 단위

### CAT-7. 이름을 바꾸면 소속 blog 글이 따라가고 이전·새 카테고리 캐시를 모두 무효화한다

- 전제: 관리자. "dev"에 blog 글 2개가 있고 "개발"은 없다.
- 행동: `updateCategory("dev", { slug: "개발" })`을 호출한다.
- 결과: `categories`의 slug를 "dev"에서 "개발"로 바꾸고 `posts.update({ category_slug: "개발" }).eq("type", "blog").eq("category_slug", "dev")`를 호출한다. `revalidateTag`를 `posts:public:blog`, `posts:public:blog:category:dev`, `posts:public:blog:category:개발`에 대해(모두 `"default"`) 호출하고 `revalidatePath("/article")`을 호출한다. 반환은 `{ success: true, slug: "개발" }`이다. "dev" 행이 없으면 `{ success: false, error: "not_found" }`다.
- 테스트 층: 단위

### CAT-8. 공개 범위를 바꾸면 그 카테고리의 공개 캐시를 무효화한다

- 전제: 관리자. public 카테고리 "개발"이 있다.
- 행동: `updateCategory("개발", { visibility: "private" })`을 호출한다.
- 결과: `categories.update({ visibility: "private" }).eq("slug", "개발")`을 호출하고 `revalidateTag`를 `posts:public:blog`, `posts:public:blog:category:개발`에 대해 호출한 뒤 `revalidatePath("/article")`을 호출한다. 반환은 `{ success: true, slug: "개발" }`이다. 없는 slug면 `{ success: false, error: "not_found" }`다.
- 테스트 층: 단위

### CAT-9. 글이 남은 카테고리는 이동 대상 없이 지울 수 없다

- 전제: 관리자. "개발"에 blog 글 3개가 있다.
- 행동: `deleteCategory("개발")`, `deleteCategory("개발", "개발")`, `deleteCategory("개발", "없는카테고리")`를 호출한다.
- 결과: 차례로 `{ success: false, error: "in_use" }`, `{ success: false, error: "이동할 카테고리를 다시 선택해주세요." }`, `{ success: false, error: "이동할 카테고리가 존재하지 않아요." }`를 돌려준다. `posts`·`categories`를 바꾸지 않고 캐시도 무효화하지 않는다.
- 테스트 층: 단위

### CAT-10. 이동 대상을 주면 blog 글을 옮긴 뒤 카테고리를 지우고 양쪽 캐시를 무효화한다

- 전제: 관리자. "dev"에 blog 글 3개가 있고 "개발"이 있다.
- 행동: `deleteCategory("dev", "개발")`을 호출한다.
- 결과: `posts.update({ category_slug: "개발" }).eq("type", "blog").eq("category_slug", "dev")` 다음에 `categories.delete().eq("slug", "dev")`를 호출한다. `revalidateTag`를 `posts:public:blog`, `posts:public:blog:category:dev`, `posts:public:blog:category:개발`에 대해 호출하고 `revalidatePath("/article")`을 호출한 뒤 `{ success: true }`를 돌려준다. 글이 없는 카테고리는 이동 없이 바로 지운다.
- 테스트 층: 단위

### CAT-11. 순서 변경은 이웃과 자리를 바꾸고 전체 sort_order를 1부터 다시 매긴다

- 전제: 관리자. `sort_order`·`slug` 순서가 [a, b, c]다(`sort_order`가 겹쳐도 된다).
- 행동: `reorderCategory("b", "up")`, `reorderCategory("a", "up")`, `reorderCategory("c", "down")`을 호출한다.
- 결과: 첫 호출은 `categories.upsert([{ slug: "b", sort_order: 1 }, { slug: "a", sort_order: 2 }, { slug: "c", sort_order: 3 }], { onConflict: "slug" })`과 `revalidatePath("/article")`만 호출하고 `{ success: true }`를 돌려준다(태그 무효화 없음). 나머지 두 호출은 아무것도 바꾸지 않고 `{ success: true }`를 돌려준다. 없는 slug면 `{ success: false, error: "not_found" }`다.
- 테스트 층: 단위

### CAT-12. 모달은 사용 중인 카테고리를 지울 때 이동 대상을 고르게 한다

- 전제: 관리자 모달이 열려 있다. "dev"의 `inUse`는 3이고 "개발"·"일상"이 더 있다.
- 행동: "dev" 행의 "삭제"를 누르고 이동 대상을 고르지 않은 채 "삭제 확정"을 누른다. 이어서 "개발"을 고르고 "삭제 확정"을 누른 뒤 확인 창을 수락한다.
- 결과: 이동 대상 선택 상자에 "dev"는 없다. 고르지 않았을 때는 toast "이동할 카테고리를 선택해주세요."를 띄우고 `deleteCategory`를 호출하지 않는다. 고른 뒤에는 확인 문구 "정말 삭제할까요? (3개 글을 '개발'로 이동 후 삭제)"를 수락하면 `deleteCategory("dev", "개발")`을 호출하고, 성공하면 toast "카테고리 삭제 완료"를 띄운 뒤 목록을 다시 불러오고 `router.refresh()`를 호출한다. `inUse`가 0이면 "사용 중인 글이 없어서 바로 삭제할 수 있어요."를 보여 주고 `deleteCategory("dev", undefined)`를 호출한다.
- 테스트 층: 컴포넌트(jsdom)

### CAT-13. 모바일 카테고리 선택은 고른 카테고리의 목록으로 이동한다

- 전제: `categories: [{ slug: "개발 노트", visibility: "public" }]`, `categoryCounts: { "개발 노트": 2 }`, `totalCount: 5`, `selectedCategory: ""`.
- 행동: `CategorySelect`를 렌더하고 "개발 노트"를 고른 뒤 "전체 글"을 고른다.
- 결과: 옵션은 "전체 글 (5)", "개발 노트 (2)"이고(개수가 없으면 0) 처음에는 "전체 글"이 선택돼 있다. "개발 노트"를 고르면 `router.push("/article?category=" + encodeURIComponent("개발 노트"))`, "전체 글"을 고르면 `router.push("/article")`을 호출한다.
- 테스트 층: 컴포넌트(jsdom)

## 4. 계약

서버 액션(`lib/actions/categories.ts`, `"use server"`). slug는 trim 후 비어 있거나 50자를 넘거나 `/`를 포함하면 거부한다(`normalizeSlug`).

| 액션 | 인자 | 성공 | 실패 `error` | 호출 권한 |
| --- | --- | --- | --- | --- |
| `getCategories` | 없음 | `{ success: true, categories: Category[] }` | `"DB Error: <message>"` | 누구나. 목록은 세션 클라이언트(RLS). `inUse`는 `isAdminDb`가 true일 때만 service role로 계산 |
| `createCategory` | `slug: string` | `{ success: true, slug }` | `"카테고리 이름을 확인해주세요."`, `"conflict"`, `"DB Error: <message>"` | 관리자(`requireAdmin("/")`) |
| `updateCategory` | `oldSlug: string, { slug?, visibility? }` | `{ success: true, slug: <최종 slug> }` | `"카테고리를 확인해주세요."`, `"변경할 값이 없어요."`, `"conflict"`, `"not_found"`, `"DB Error: <message>"` | 관리자 |
| `deleteCategory` | `slug: string, moveTo?: string` | `{ success: true }` | `"카테고리를 확인해주세요."`, `"in_use"`, `"이동할 카테고리를 다시 선택해주세요."`, `"이동할 카테고리가 존재하지 않아요."`, `"not_found"`, `"DB Error: <message>"` | 관리자 |
| `reorderCategory` | `slug: string, direction: "up" \| "down"` | `{ success: true }`(경계에서 못 움직여도 성공) | `"요청이 올바르지 않아요."`, `"not_found"`, `"DB Error: <message>"` | 관리자 |

- `Category` = `{ slug, visibility: "public" | "private", sortOrder, inUse? }`.
- 관리자 전용 액션의 비관리자 호출: 비로그인은 `/login?from=%2F`, 일반 사용자는 `/`로 redirect한다.
- 쓰기 액션 4개는 `requireAdmin` 뒤 service role 클라이언트로 쓴다.
- 성공 시 캐시 무효화(`revalidateTag` 두 번째 인자는 모두 `"default"`):

| 액션 | `revalidateTag` | `revalidatePath` |
| --- | --- | --- |
| `createCategory` | `posts:public:blog` | `/article` |
| `updateCategory` | `posts:public:blog`, `posts:public:blog:category:<oldSlug>`, `posts:public:blog:category:<최종 slug>` | `/article` |
| `deleteCategory` | `posts:public:blog`, `posts:public:blog:category:<slug>`, `moveTo`를 주면 `posts:public:blog:category:<moveTo>` | `/article` |
| `reorderCategory` | 없음 | `/article`(실제로 자리를 바꿨을 때만) |

화면 컴포넌트:

- `CategorySettingsModal`(`"use client"`, props 없음). `/article` 사이드바에 관리자에게만 렌더된다(article 명세).
  - 톱니 버튼(aria-label "카테고리 설정")을 누르면 `<dialog>`를 열고 `getCategories()`로 목록을 불러온다.
  - 목록 상태: 비어 있고 불러오는 중이면 "불러오는 중...", 비어 있으면 "카테고리가 없어요.". 불러오기 실패는 toast "카테고리 목록을 불러오지 못했어요.".
  - 행: slug, "사용 N", 공개·비공개 아이콘, ↑·↓(첫 행 ↑, 마지막 행 ↓ 비활성), 공개 범위 선택("공개"·"비공개"), "이름 변경", "삭제". 이름 변경·삭제 패널이 열린 행은 ↑·↓와 공개 범위 선택을 숨긴다.
  - toast:
    - 생성: "카테고리 생성 중..." 다음 "카테고리 생성 완료". conflict면 "이미 존재하는 카테고리예요.", 그 밖의 실패는 서버 `error`.
    - 이름 변경: "이름 변경 중..." 다음 "카테고리 이름 변경 완료".
    - 삭제: "카테고리 삭제 중..." 다음 "카테고리 삭제 완료". `in_use`면 "사용 중인 카테고리라서 이동 카테고리가 필요해요.".
    - 순서 변경 실패: "카테고리 순서 변경에 실패했어요.". 공개 범위 변경 실패: "카테고리 공개 범위 변경에 실패했어요.".
  - 쓰기가 성공하면 목록을 다시 불러오고 `router.refresh()`를 호출한다.
- `CategorySelect`(`"use client"`). props `{ categories, selectedCategory, categoryCounts, totalCount }`.
  - `lg` 미만 화면에서만 보인다(`lg:hidden`).
  - 옵션은 "전체 글 (<totalCount>)"과 "<slug> (<개수, 없으면 0>)"이다. `categories`는 받은 그대로 보여 주며, 공개 범위 필터링은 호출하는 화면과 RLS가 맡는다.

## 5. 데이터

- 기본 스키마(`create table categories/posts`, slug 고유 제약, `is_admin()` 함수)는 저장소 마이그레이션에 없다. 아래는 저장소에 있는 마이그레이션 기준이다.
- `public.categories`(`20260102121000_add_category_visibility_and_sort_order.sql`)
  - `visibility text not null default 'public'`. `categories_visibility_check`가 `'public'` 또는 `'private'`만 허용한다.
  - `sort_order integer not null default 0`. 인덱스 `categories_sort_order_idx`가 있고 고유 제약은 없다. 기존 행은 `(sort_order, slug)` 순서로 1부터 다시 채웠다.
  - RLS `categories_select`: `for select to public using (visibility = 'public' or is_admin())`.
  - insert·update·delete 정책은 저장소에 없다. 쓰기는 service role을 전제로 한다.
- `public.posts`
  - `category_slug`. FK `posts_category_slug_fkey` → `categories(slug)` `on update cascade on delete set null`, 인덱스 `posts_category_slug_idx`(`20260404170000_add_post_category_fk.sql`, `20260404161000_perf_indexes.sql`).
  - RLS `posts_select_public`(`to anon, authenticated`): public이고 diary가 아니며, blog면 카테고리가 public일 때만 보인다.
- `public.comments`: RLS `comments_select_authenticated`·`comments_insert_authenticated`도 blog 글의 카테고리가 public일 것을 요구한다(댓글 명세).
- 캐시 태그: `posts:public:blog`, `posts:public:blog:category:<slug>`(`lib/server/publicPosts.ts`).
- Storage: 없음.

## 6. 불변식

번호는 [불변식](../INVARIANTS.md) 문서의 항목 번호다.

- **1. 비공개 격리:** private 카테고리와 그 안의 blog 글·댓글은 RLS(`categories_select`·`posts_select_public`·댓글 정책)가 가린다. `getCategories` 목록은 세션 클라이언트로 읽어 RLS가 적용된다. service role 조회(`inUse`)는 관리자 분기에서만 한다. 관리 모달은 관리자에게만 렌더된다.
- **2. 관리자 판정:** 쓰기 액션 4개는 첫 줄에서 `requireAdmin("/")`을 호출한 뒤 service role을 쓴다. `getCategories`는 `requireAdmin` 없이 `isAdminDb`만 보고 service role을 쓴다. `requireAdmin` 자체의 헤더 신뢰 문제와 함께 현행 위반이다(§7).
- **3. 글 타입 규칙:** 글이 있는 카테고리 삭제는 이동 대상을 요구해(`"in_use"`) 카테고리 없는 blog 글을 만들지 않는다. 이름 변경은 blog 글의 `category_slug`를 함께 바꾼다(FK cascade와 명시적 update). 경쟁 상황의 예외는 §7에 적었다.
- **4. 쓰기는 관리자만:** 카테고리 생성·수정·삭제·정렬은 관리자만 한다.
- **5. 공개 캐시:** 생성·이름 변경·공개 범위 변경·삭제는 성공 직후 `posts:public:blog`, 해당 `posts:public:blog:category:<slug>` 태그와 `/article`을 무효화한다. 정렬은 `/article`만 무효화한다. 순서는 태그 캐시에 들어가지 않고 `/article`이 요청마다 세션 클라이언트로 직접 읽기 때문이다.
- **6. 비밀값:** service role 클라이언트는 `"use server"` 모듈 안에서만 만든다. `CategorySettingsModal`은 서버 액션 참조와 `Category` 타입만 import하므로 키가 번들에 들어가지 않는다. `CategorySelect`는 서버 모듈을 import하지 않는다.
- **7. 마이그레이션은 추가만:** 카테고리 열과 정책은 기존 마이그레이션(`20260102121000`, `20260404170000`)에 있으며 이 기능은 이를 고치지 않는다.

## 7. 미결·확인 필요

- 관리자 판정 위조([auth 명세](auth.md) §7): 쓰기 액션 4개의 `requireAdmin`은 `getCurrentUser`(`x-user-id`)와 `isAdminDb`(`x-user-is-admin`, `user_metadata.is_admin`)를 거치므로 위조 헤더만으로 통과한다. 이후 모든 쓰기가 service role이라 RLS 2차 방어가 없다. 비로그인 요청으로도 카테고리 생성·이름 변경·삭제(글 이동 포함)·공개 범위 변경이 가능하다. private 카테고리를 public으로 바꾸면 그 안의 public blog 글이 노출된다.
- `getCategories`는 `requireAdmin` 없이 `isAdminDb`만으로 service role 조회를 한다(불변식 2의 "requireAdmin 뒤에만" 위반). 위조하면 공개 카테고리의 `inUse`에 private 글 수가 섞여 나간다. 목록 자체는 세션 RLS라 private 카테고리 이름은 나가지 않는다.
- `sort_order` 경쟁: `createCategory`와 `createPost`의 자동 생성이 각자 "최댓값 조회 → +1 insert"를 한다. 동시에 만들면 같은 `sort_order`가 생긴다(고유 제약 없음, 정렬은 slug로 갈린다). 존재 확인과 insert 사이 경쟁에서는 `"conflict"` 대신 DB 고유 제약 오류 문자열이 나간다(slug 고유 제약은 기본 스키마에 있다고 가정).
- `reorderCategory`는 전체 목록을 읽고 upsert로 다시 쓴다. 그 사이 삭제된 카테고리는 upsert가 다시 insert해 `visibility` 기본값 `'public'`으로 되살아난다. 그 사이 생성된 카테고리는 payload에 없어 `sort_order`가 겹칠 수 있다.
- `updateCategory` 이름 변경은 트랜잭션이 아니다. FK가 `on update cascade`라 slug 변경 시 글이 이미 따라가므로 이어지는 `posts` update는 사실상 0행이다. 그 update가 실패할 때의 되돌리기 update는 오류를 확인하지 않는다. 새 이름 존재 확인 쿼리의 `error`도 무시한다.
- `updateCategory`에 넘긴 새 slug가 `normalizeSlug`에서 거부되면(50자 초과·`/` 포함) 원인과 다른 문구 `"변경할 값이 없어요."`를 돌려준다. `visibility`와 함께 넘기면 이름 변경을 조용히 건너뛰고 성공을 돌려준다.
- `deleteCategory`도 트랜잭션이 아니다. 글 이동 뒤 삭제가 실패하면 글만 옮겨진 채 남는다. 사용 수 확인과 삭제 사이에 그 카테고리로 저장된 글은 FK `on delete set null`로 `category_slug`가 NULL이 되어 카테고리 없는 blog 글이 생긴다(불변식 3).
- 이동 대상의 공개 범위를 확인·경고하지 않는다. private 카테고리의 글을 public 카테고리로 옮기면 그중 public 글이 즉시 공개된다(반대 방향은 숨겨진다). 모달 확인 문구에도 안내가 없다.
- `createPost`(posts 명세)의 카테고리 자동 생성은 `normalizeSlug`를 거치지 않는다. 그래서 50자 초과나 `/`를 포함한 카테고리가 생길 수 있고, 그런 카테고리는 카테고리 액션이 `"카테고리를 확인해주세요."`·`"요청이 올바르지 않아요."`로 거부해 이름 변경·삭제·정렬을 할 수 없다.
- 오류 문자열 노출: `"DB Error: <message>"`를 그대로 돌려주고 모달이 생성·이름 변경·삭제 실패 toast로 띄운다. DB 제약·열 이름이 클라이언트에 나간다.
- 카테고리 공개 범위는 코드가 아니라 RLS(`posts_select_public`·`categories_select`·댓글 정책)만으로 강제한다. `getPostBySlugDirectly`·`getPostsDirectly`·`getPublicPosts`는 카테고리 `visibility`를 보지 않는다. service role로 blog 글을 읽는 경로가 새로 생기면 private 카테고리가 샌다. 관리자가 private 카테고리 글을 보는 것은 기본 스키마의 관리자용 posts 정책에 달려 있어 저장소에서 확인할 수 없다.

## 8. 관련 코드

- `lib/actions/posts.ts` `createPost`(posts 명세): blog 글에 카테고리가 없으면 `"아티클은 카테고리가 필요해요."`로 거부한다. 없는 카테고리는 service role로 `{ visibility: "public", sort_order: 최댓값 + 1 }`로 자동 생성하고, 저장 후 `posts:public:blog:category:<slug>`를 무효화한다.
- `app/_components/PostEditor.tsx`(posts 명세): blog 작성·수정 시 `getCategories()`로 카테고리 후보를 불러온다.
- `lib/server/publicPosts.ts` `publicPostsTag`·`publicBlogCategoryTag`·`getPublicPosts`·`getPublicPostCounts`(posts 명세): 캐시 태그 이름을 정의하고, anon 키로 카테고리별 공개 글과 글 수를 읽는다(RLS가 private 카테고리를 뺀다).
- `app/article/page.tsx`(article 명세): 세션 클라이언트로 카테고리 사이드바를 읽고 `sort_order`·slug(ko) 순으로 정렬한다. 관리자에게만 `CategorySettingsModal`을 렌더하고 `CategorySelect`에 `categories`·개수를 넘긴다. 비관리자가 보이지 않는 카테고리를 `?category=`로 요청하면 `notFound()`다.
- `app/article/category/[slug]/page.tsx`(article 명세): `/article?category=<slug>`로 redirect한다.
- `app/article/[slug]/page.tsx`(article 명세): 상세 머리에 카테고리 링크 `/article?category=<slug>`를 보여 준다.
- `lib/server/admin.ts` `requireAdmin`·`isAdminDb`, `lib/supabase/service.ts`, `lib/supabase/server.ts`(auth 명세).
