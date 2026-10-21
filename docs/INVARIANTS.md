# 불변식

- **상태:** 정본 (7개 항목)
- **작성:** 2026-10-21
- **근거:** 이전 `AGENTS.md` §1·§3.3의 제품·보안 규칙과 현행 코드(RLS 정책·서버 액션)

모든 기능·테스트가 지켜야 하는 규칙이다. 범위를 줄여도 예외는 없다. 명세의 §6 불변식 절은 이 문서의 번호를 쓴다.

---

## 1. 비공개 격리

- `private` 글·이미지·댓글과 `private` 카테고리, 그리고 다이어리 본문은 관리자가 아니면 어떤 경로로도 받을 수 없다. 목록·상세·댓글·이미지·sitemap·공개 캐시가 모두 대상이다.
- 비관리자에게 비공개 다이어리를 목록으로 보여 줄 때는 제목을 "일기"로 가리고 본문을 빈 문자열로 보낸다.
- 강제: RLS(`posts_select_public`, `comments_select_authenticated`, `categories_select`)가 1차, 서버 코드의 관리자 확인이 2차 방어다. service role 클라이언트로 조회할 때는 서버 코드가 열과 행을 직접 제한한다.

## 2. 관리자 판정은 서버가 확인한 세션으로만

- 관리자 여부는 Supabase가 검증한 세션(`auth.getUser()`)의 사용자와 그 사용자의 `app_metadata.is_admin` 또는 `public.users.is_admin`으로만 판정한다.
- 클라이언트가 보낼 수 있는 값(요청 헤더·쿠키 값 자체·폼 필드·쿼리)과 사용자가 스스로 바꿀 수 있는 `user_metadata`를 근거로 삼지 않는다.
- 강제: 관리자 전용 서버 액션·라우트 핸들러는 첫 줄에서 `requireAdmin`을 호출한다. service role 클라이언트는 그 뒤에만 쓴다.
- 현행 위반: [auth 명세](specs/auth.md) §7 참고.

## 3. 글 타입 규칙

- 글 타입은 `blog`(화면 이름 "아티클")·`feed`·`diary` 셋이다.
- `blog`는 카테고리가 필수다. `feed`는 항상 `public`이고 제목이 비면 본문에서 만든다. `diary`는 댓글이 없다(조회·작성 모두).
- 경로의 타입과 글의 타입이 다르면 404다(예: `/article/<feed 글 slug>`).

## 4. 쓰기는 관리자만, 댓글은 로그인 사용자

- 글·카테고리·이미지 업로드는 관리자만 한다.
- 댓글은 로그인 사용자가 쓰고, 지우기는 작성자 본인 또는 관리자만 한다. 대댓글은 한 단계까지다.

## 5. 공개 캐시 정합성

- 공개 목록 캐시(`posts:public:<type>`, `posts:public:blog:category:<slug>` 태그)와 ISR 페이지에는 공개 데이터만 들어간다.
- 글·카테고리를 바꾸는 서버 액션은 성공 직후 해당 태그와 경로를 무효화한다.
- 라우트 세그먼트의 `revalidate` 값은 리터럴이어야 하므로 `REVALIDATE_PERIOD`(`lib/constants.ts`)와 같은 값을 쓰고 `// REVALIDATE_PERIOD` 주석을 단다.

## 6. 비밀값은 서버에만

- `SUPABASE_SERVICE_ROLE_KEY`는 서버 코드(`lib/supabase/service.ts`를 거치는 서버 액션·라우트 핸들러·서버 컴포넌트)에서만 읽는다. `"use client"` 모듈이 import하지 않는다.
- 비밀값은 커밋하지 않는다. 변수 이름만 `.env.example`에 적는다.

## 7. 마이그레이션은 추가만

- `supabase/migrations/`에 커밋된 SQL은 고치거나 지우지 않는다. 바꿀 내용은 새 마이그레이션으로 쓴다.
- 강제: 편집 가드와 커밋 가드가 막는다.
