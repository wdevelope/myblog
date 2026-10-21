# 명세: 글 (작성·수정·삭제·조회)

- **상태:** 현행
- **ID 접두:** POST
- **근거:** 현행 코드 역작성(2026-10-21)
- **코드 경로:** `lib/actions/posts.ts`, `lib/server/posts.ts`, `lib/server/publicPosts.ts`, `lib/markdown.ts`, `lib/types.ts`, `lib/constants.ts`, `app/_components/PostEditor.tsx`, `app/_components/CkEditor.tsx`, `app/_components/HtmlContent.tsx`, `app/_components/PostActionMenu.tsx`, `app/_components/DeletePostButton.tsx`
- **승인:** 2026-10-21

## 1. 목적

관리자가 아티클(`blog`)·피드(`feed`)·다이어리(`diary`) 글을 쓰고 고치고 지운다. 방문자와 로그인 사용자는 공개 범위에 맞는 글만 조회한다. 섹션별 화면은 article·feed·diary 명세가 갖고, 이 명세는 세 타입이 함께 쓰는 저장·조회 규칙과 에디터를 다룬다.

## 2. 범위

- 포함: `createPost`(작성·수정)·`deletePost` 서버 액션, 서버 조회(`getPostsDirectly`·`getPostBySlugDirectly`·`getCommentsDirectly`), 공개 목록 캐시 조회(`getPublicPosts`·`getPublicPostCounts`), 본문 요약·자동 제목, 에디터·본문 렌더링·글 메뉴·삭제 버튼.
- 제외: 댓글 작성·삭제(comments), 카테고리 관리(categories), 이미지 업로드·표시(images), 관리자 판정(auth), 조회수 증가(현재 호출하는 코드 없음, §7).

## 3. 시나리오

### POST-1. 관리자가 아니면 글을 쓰거나 지울 수 없다

- 전제: 비로그인 또는 관리자가 아닌 로그인 사용자.
- 행동: `createPost` 또는 `deletePost`를 호출한다.
- 결과: `requireAdmin("/")`이 비로그인은 `/login?from=%2F`, 비관리자는 `/`로 리다이렉트한다. DB는 바뀌지 않는다.
- 테스트 층: 단위

### POST-2. 아티클은 카테고리 없이 저장할 수 없다

- 전제: 관리자.
- 행동: `type: "blog"`, `categorySlug`가 비어 있는 입력으로 `createPost`를 호출한다.
- 결과: `{ success: false, error: "아티클은 카테고리가 필요해요." }`를 돌려주고 저장하지 않는다.
- 테스트 층: 단위

### POST-3. 피드는 요청한 공개 범위와 상관없이 public으로 저장된다

- 전제: 관리자.
- 행동: `type: "feed"`, `visibility: "private"`로 `createPost`를 호출한다.
- 결과: 저장된 글의 `visibility`는 `"public"`이다. 에디터도 피드 타입이면 공개 범위를 `public`으로 되돌린다.
- 테스트 층: 단위

### POST-4. 피드 제목이 비면 본문에서 자동 제목을 만든다

- 전제: 피드 입력의 `title`이 비어 있다.
- 행동: `createPost` 또는 `toAutoTitle(content)`.
- 결과: HTML 태그를 지운 본문을 48자 안에서 단어 경계로 자른 문자열이 제목이 된다(말줄임 `…`는 붙이지 않는다). 남는 글자가 없으면 `"피드"`다.
- 테스트 층: 단위

### POST-5. 본문 요약은 HTML을 지우고 단어 경계에서 자른다

- 행동: `toExcerpt(content, maxLength = 240)`.
- 결과: 태그를 공백으로 바꾸고 연속 공백을 하나로 줄인다. `maxLength`를 넘으면 그 안의 마지막 단어 경계에서 자르고 `…`를 붙인다. 빈 본문은 `""`다.
- 테스트 층: 단위

### POST-6. 작성일 지정은 새 다이어리에만 허용하고 KST 정오로 저장한다

- 전제: 관리자.
- 행동: `createdAtYmd`를 넣어 `createPost`를 호출한다.
- 결과:
  - 다이어리가 아니면 `"createdAtYmd는 다이어리에만 사용할 수 있어요."`, 수정(`id` 있음)이면 `"createdAtYmd는 신규 다이어리 작성에서만 사용할 수 있어요."`, `YYYY-MM-DD`가 아니면 `"createdAtYmd 형식이 올바르지 않아요. (YYYY-MM-DD)"` 오류다.
  - 정상이면 `created_at`을 `<YYYY-MM-DD>T12:00:00+09:00`의 ISO 값으로 저장한다.
- 테스트 층: 단위

### POST-7. 새 글 slug는 `post-<16진수 6자리>`이고 수정은 기존 slug를 유지한다

- 행동: `createPost`로 새 글을 쓰거나(`id` 없음) 기존 글을 고친다(`id`·`slug` 있음).
- 결과: 새 글은 `post-xxxxxx`로 만들고, 같은 slug가 있으면 최대 5번 다시 뽑는다. 수정은 넘겨받은 slug를 그대로 쓴다. 저장은 `id` 기준 upsert다.
- 테스트 층: 단위

### POST-8. 아티클을 저장할 때 없는 카테고리는 공개·마지막 순서로 자동 생성한다

- 전제: 관리자, `categorySlug`가 `categories`에 없다.
- 행동: `type: "blog"`로 `createPost`를 호출한다.
- 결과: `categories`에 `{ slug, visibility: "public", sort_order: <현재 최대 + 1> }`을 넣은 뒤 글을 저장한다. 동시에 만들어져 unique 위반(`23505`)이 나면 무시하고 진행한다.
- 테스트 층: 단위

### POST-9. 저장·삭제에 성공하면 공개 캐시 태그와 경로를 무효화한다

- 행동: `createPost` 또는 `deletePost`가 성공한다.
- 결과: `revalidateTag("posts:public:<type>")`, 아티클이면 `revalidateTag("posts:public:blog:category:<slug>")`를 부르고, `revalidatePath("/")`, `revalidatePath("/<type>")`, 아티클이면 `revalidatePath("/article")`를 부른다.
- 테스트 층: 단위

### POST-10. 없는 글을 지우면 not_found를 돌려준다

- 전제: 관리자.
- 행동: 없는 slug로 `deletePost`를 호출한다.
- 결과: `{ success: false, error: "not_found" }`이고 캐시를 무효화하지 않는다.
- 테스트 층: 단위

### POST-11. 관리자가 아니면 목록·상세 조회는 public 글만 받는다

- 행동: 비관리자로 `getPostsDirectly`(다이어리 제외) 또는 `getPostBySlugDirectly`를 호출한다.
- 결과: 쿼리에 `visibility = "public"` 조건이 붙는다. private 글 상세는 찾지 못해 `status: 404` 오류가 난다. 관리자는 조건 없이 모두 받는다.
- 테스트 층: 단위

### POST-12. 관리자가 아니면 다이어리 목록은 본문 없이, 비공개 글 제목은 "일기"로 받는다

- 행동: 비관리자로 `getPostsDirectly({ type: "diary" })`를 호출한다.
- 결과: service role로 다이어리 전체를 조회하되 `content`는 `""`, `imageKeys`는 `[]`, private 글의 `title`은 `"일기"`로 바꿔 돌려준다. 조회 열에 `content`를 넣지 않는다.
- 테스트 층: 단위

### POST-13. 공개 목록은 anon 키 REST 조회와 태그 캐시로 public 글만 받는다

- 행동: `getPublicPosts({ type, category?, page?, limit?, revalidateSeconds? })`.
- 결과: `type`·`visibility=eq.public`·(있으면) `category_slug` 조건, `created_at` 내림차순으로 PostgREST를 부른다. 캐시는 `force-cache`, 태그 `posts:public:<type>`(카테고리가 있으면 카테고리 태그 추가), 기본 60초 재검증이다. 전체 개수는 `Content-Range` 헤더에서 읽는다. 응답이 실패면 `Supabase REST <status>: <본문>` 오류를 던진다.
- 테스트 층: 단위

### POST-14. 카테고리별 공개 글 수는 카테고리→글 중첩 count로 센다

- 행동: `getPublicPostCounts(type)`.
- 결과: `categories?select=slug,posts(count)`에 `posts.type`·`posts.visibility=eq.public` 조건을 붙여 한 번에 센다. `{ counts: { <slug>: <개수> }, total }`을 돌려주고, 응답이 실패면 `{ counts: {}, total: 0 }`이다.
- 테스트 층: 단위

### POST-15. 다이어리 글과 관리자가 아닐 때의 private 글은 서버 조회에서 댓글이 비어 있다

- 행동: `getCommentsDirectly({ postId, user })`.
- 결과: 다이어리 글이면 `[]`, 비관리자에게 private 글이면 `[]`다. 그 밖에는 `created_at` 오름차순 댓글 목록이다.
- 테스트 층: 단위

### POST-16. 에디터는 저장에 성공하면 초안을 지우고 타입별 화면으로 이동한다

- 전제: 관리자가 작성·수정 화면에서 내용을 채웠다.
- 행동: 저장 버튼을 누른다.
- 결과: 성공하면 localStorage 초안을 지우고 아티클은 `/article/<slug>`, 피드는 `/feed`, 다이어리는 `/diary/<slug>`로 이동한다. 실패하면 오류 문구(`result.error`)를 보여 준다. 본문이 비면 `"내용을 입력해주세요."`, 아티클 카테고리가 비면 `"아티클은 카테고리가 필요해요."`, 피드가 아닌 글의 제목이 비면 `"제목을 입력해주세요."`다.
- 테스트 층: 컴포넌트(jsdom)

### POST-17. 삭제 버튼은 확인을 받은 뒤에만 지우고 지정한 경로로 이동한다

- 행동: `DeletePostButton`을 누른다.
- 결과: 확인창에서 취소하면 `deletePost`를 부르지 않는다. 확인하면 삭제하고 `redirectTo`가 있으면 그 경로로 `replace`한 뒤 새로고침한다. 실패하면 토스트에 오류 문구를 띄운다.
- 테스트 층: 컴포넌트(jsdom)

## 4. 계약

- 서버 액션 (`lib/actions/posts.ts`, `"use server"`)
  - `createPost(input: CreatePostInput): Promise<CreatePostResult>` — 관리자 전용. 반환 `{ success: true, data: Post 필드 }` 또는 `{ success: false, error: string }`. 오류 문구: 타입·공개 범위 검증, `"내용을 입력해주세요."`, `"아티클은 카테고리가 필요해요."`, `"제목을 입력해주세요."`, createdAtYmd 오류(POST-6), `"DB Error: <메시지>"`.
  - `deletePost(slug: string): Promise<DeletePostResult>` — 관리자 전용. `{ success: true }` 또는 `{ success: false, error: "not_found" | "DB Error: …" }`.
- 서버 조회 (`lib/server/posts.ts`): `getPostsDirectly`, `getPostBySlugDirectly`(없으면 `status: 404`, 비관리자에게 private면 `status: 403` 오류), `getCommentsDirectly`, `mapPost`.
- 공개 캐시 조회 (`lib/server/publicPosts.ts`, `server-only`): `getPublicPosts`, `getPublicPostCounts`, `publicPostsTag(type)`, `publicBlogCategoryTag(slug)`.
- 화면 부품: `PostEditor`(작성·수정 전체 화면, 피드 초안 localStorage 복원), `CkEditor`(본문 편집기, 이미지 업로드 어댑터), `HtmlContent`(CKEditor HTML 렌더링), `PostActionMenu`(수정 링크·삭제 메뉴), `DeletePostButton`.

## 5. 데이터

- `public.posts`: `id`, `slug`, `type`(`blog|feed|diary`), `visibility`(`public|private`), `title`, `content`(HTML), `category_slug`(→ `categories.slug`, `on update cascade`, `on delete set null`), `image_keys text[]`, `thumbnail_image_key`, `author_id`, `view_count`, `created_at`, `updated_at`.
- RLS `posts_select_public`: anon·authenticated는 public이고 다이어리가 아니며, 아티클이면 카테고리도 public인 글만 본다.
- 인덱스: `posts_slug_idx`, `posts_type_visibility_idx`, `posts_category_slug_idx`, `posts_created_at_idx`.
- 쓰기는 service role 클라이언트로 하므로 RLS를 거치지 않는다.

## 6. 불변식

- 1 비공개 격리: 비관리자 조회에 `visibility = public` 조건(POST-11), 다이어리 목록의 본문 제거·제목 가림(POST-12), 공개 캐시는 anon 키 + public 조건(POST-13).
- 2 관리자 판정: 쓰기 액션 첫 줄의 `requireAdmin`(POST-1). 판정 자체의 현행 결함은 auth §7.
- 3 글 타입 규칙: POST-2·POST-3·POST-4·POST-6.
- 4 쓰기는 관리자만: POST-1.
- 5 공개 캐시 정합성: POST-9.

## 7. 미결·확인 필요

- 쓰기를 service role로 하므로 `requireAdmin`이 유일한 방어선이다. auth §7의 관리자 판정 결함이 그대로 글 작성·삭제 권한 우회로 이어진다.
- `HtmlContent`가 본문 HTML을 정화 없이 `dangerouslySetInnerHTML`로 넣는다. 작성자가 관리자뿐이라는 전제에 기대므로, 관리자 판정이 뚫리면 저장형 XSS가 된다.
- `revalidatePath("/<type>")`가 아티클이면 존재하지 않는 `/blog`를 무효화한다(아티클 경로는 `/article`을 따로 무효화하므로 동작 문제는 없다).
- slug 유일성을 조회 후 저장으로 확인한다. DB에 unique 제약이 있는지는 기본 스키마가 저장소에 없어 확인할 수 없다.
- `getPostBySlugDirectly`의 403 분기는 비관리자 조회에 이미 public 조건이 붙어 도달하지 않는다(항상 404).
- `view_count`·`increment_post_view` 함수는 있지만 조회수를 올리는 코드가 없다. 화면의 조회수는 늘지 않는다.
- 오류 응답에 `DB Error: <원문>`을 그대로 돌려준다(관리자 화면에만 보이지만 판정 결함이 있으면 노출된다).
- 에디터 초안 복원은 피드 타입에서만 동작한다.

## 8. 관련 코드

- `app/article/`·`app/feed/`·`app/diary/`의 목록·상세·작성·수정 화면(article·feed·diary 명세)이 이 명세의 조회 함수와 `PostEditor`·`PostActionMenu`·`HtmlContent`를 쓴다.
- `app/page.tsx`(site 명세)가 `getPublicPosts`로 홈 목록을 만든다.
- `app/sitemap.ts`(site 명세)가 공개 글 목록을 쓴다.
