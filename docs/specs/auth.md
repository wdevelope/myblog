# 명세: 인증·관리자 판정

- **상태:** 현행
- **ID 접두:** AUTH
- **근거:** 현행 코드 역작성(2026-10-21)
- **코드 경로:** `lib/server/admin.ts`, `lib/supabase/`, `middleware.ts`, `app/login/`, `app/logout/`, `app/auth/`, `app/_components/AuthButton.tsx`, `app/_components/LogoutButton.tsx`
- **승인:** 2026-10-21

## 1. 목적

Supabase Auth(이메일·비밀번호)로 로그인·회원가입·로그아웃을 하고, 서버 코드가 현재 사용자와 관리자 여부를 판정한다. 관리자 판정은 글·카테고리·이미지 쓰기와 비공개 데이터 조회의 유일한 관문이다.

## 2. 범위

- 포함: 로그인·회원가입 폼, 이메일 확인 콜백, 로그아웃, 미들웨어의 세션 갱신, `getCurrentUser`·`isAdminDb`·`requireLogin`·`requireAdmin`, Supabase 클라이언트 생성(브라우저·서버·service role)과 환경변수 확인, 헤더의 로그인·로그아웃 버튼.
- 제외: 관리자 계정 지정(Supabase 대시보드에서 `app_metadata` 또는 `public.users.is_admin`을 직접 바꾼다), 소셜 로그인.

## 3. 시나리오

### AUTH-1. 로그인하면 `from` 경로로 돌아간다

- 행동: `/login?from=<경로>`에서 이메일·비밀번호로 로그인한다.
- 결과: `signInWithPassword` 성공 뒤 `from`이 `/`로 시작하면 그 경로, 아니면 `/`로 `replace`한다. 실패하면 Supabase 오류 문구를 보여 준다. "이메일 기억하기"를 켜면 이메일을 localStorage에 남긴다.
- 테스트 층: 컴포넌트(jsdom)

### AUTH-2. 회원가입은 확인 메일을 보내고 로그인 모드로 돌아간다

- 행동: 회원가입 모드에서 이메일·비밀번호·비밀번호 확인을 넣고 제출한다.
- 결과: 비밀번호가 다르면 `"비밀번호가 일치하지 않습니다."`. `signUp`의 `emailRedirectTo`는 `<origin>/auth/callback?next=<from 또는 />`이다. 세션 없이 끝나면 `"가입 확인 이메일을 보냈어요. 메일의 링크를 클릭하면 로그인됩니다."`를 보여 주고 로그인 모드로 바꾼다.
- 테스트 층: 컴포넌트(jsdom)

### AUTH-3. 이메일 확인 콜백은 코드를 세션으로 바꾸고 `next`로 보낸다

- 행동: `GET /auth/callback?code=<코드>&next=<경로>`.
- 결과: `code`가 없으면 `/login?error=missing_code`. 교환이 실패하면 `/login?error=<인코딩한 메시지>`. 성공하면 `next`가 `/`로 시작할 때 그 경로, 아니면 `/`로 리다이렉트한다.
- 테스트 층: 단위

### AUTH-4. 로그아웃하면 세션을 끝내고 로그인 화면으로 보낸다

- 행동: `GET /logout`.
- 결과: `auth.signOut()` 뒤 `/login?logged_out=1`로 리다이렉트한다.
- 테스트 층: 단위

### AUTH-5. 로그인이 필요한 곳에 비로그인으로 오면 로그인 화면으로 보낸다

- 행동: `requireLogin(from)`을 비로그인 상태로 호출한다.
- 결과: `/login?from=<encodeURIComponent(from)>`로 리다이렉트한다. 로그인 상태면 사용자를 돌려준다.
- 테스트 층: 단위

### AUTH-6. 관리자가 아니면 관리자 전용 기능에서 홈으로 보낸다

- 행동: 로그인했지만 관리자가 아닌 사용자로 `requireAdmin(from)`을 호출한다.
- 결과: `/`로 리다이렉트한다. 비로그인이면 AUTH-5와 같다.
- 테스트 층: 단위

### AUTH-7. 관리자 판정은 메타데이터 → 요청 헤더 → users 테이블 순서로 본다

- 행동: `isAdminDb(user)`.
- 결과: 사용자가 없으면 `false`. `app_metadata.is_admin` 또는 `user_metadata.is_admin`이 참이면 `true`. 아니면 요청 헤더 `x-user-is-admin`이 `"true"`면 `true`. 아니면 `public.users.is_admin`을 조회하고, 조회 오류는 `false`다. (§7: 이 순서 자체가 결함이다.)
- 테스트 층: 단위

### AUTH-8. 현재 사용자는 요청 헤더 `x-user-id`가 있으면 그 값을 쓴다

- 행동: `getCurrentUser()`.
- 결과: 요청 헤더 `x-user-id`가 있으면 Supabase를 부르지 않고 `{ id: <헤더>, email: <x-user-email 헤더> }`를 사용자로 쓴다. 없으면 `auth.getUser()` 결과다. 한 요청 안에서는 `cache`로 한 번만 계산한다. (§7: 헤더 신뢰가 결함이다.)
- 테스트 층: 단위

### AUTH-9. 미들웨어는 인증 쿠키가 없는 방문자는 Supabase를 부르지 않는다

- 행동: 정적 파일·이미지를 뺀 모든 요청이 미들웨어를 지난다.
- 결과: `sb-`로 시작하는 쿠키가 없으면 그대로 통과한다. 있으면 `auth.getUser()`로 세션 쿠키를 갱신하고, 사용자가 있으면 **응답** 헤더에 `x-user-id`·`x-user-email`, 관리자 메타데이터가 있으면 `x-user-is-admin: true`를 붙인다.
- 테스트 층: 단위

### AUTH-10. Supabase 환경변수가 없으면 이름을 담은 오류로 멈춘다

- 행동: 환경변수가 빠진 채 Supabase 클라이언트를 만든다.
- 결과: `Missing env var: NEXT_PUBLIC_SUPABASE_URL`, `Missing env var: NEXT_PUBLIC_SUPABASE_ANON_KEY`, service role 클라이언트는 `Missing env var: SUPABASE_SERVICE_ROLE_KEY` 오류를 던진다. 브라우저 번들에 들어가도록 `process.env.NEXT_PUBLIC_*`를 정적으로 읽는다.
- 테스트 층: 단위

### AUTH-11. 헤더의 인증 버튼은 로그인 상태에 따라 로그인 링크나 로그아웃 버튼을 보여 준다

- 행동: `AuthButton`이 브라우저 세션을 읽고 `onAuthStateChange`를 구독한다.
- 결과: 세션이 없으면 `/login` 링크, 있으면 로그아웃 버튼을 보여 준다. 세션이 바뀌면 바로 반영한다.
- 테스트 층: 컴포넌트(jsdom)

## 4. 계약

- 화면: `/login`(로그인·회원가입 전환, `from`·`error`·`logged_out` 쿼리), 동적 렌더링.
- 라우트 핸들러: `GET /auth/callback`, `GET /logout` (`runtime = "nodejs"`).
- 서버 함수 (`lib/server/admin.ts`): `getCurrentUser()`, `isAdminDb(user)`, `requireLogin(from)`, `requireAdmin(from)`.
- Supabase 클라이언트 (`lib/supabase/`): `createSupabaseBrowserClient`(클라이언트 컴포넌트), `createSupabaseServerClient`(서버 컴포넌트·액션·라우트 핸들러, 쿠키 세션, RLS 적용), `createSupabaseServiceClient`(서버 전용, RLS 우회), `getSupabaseEnv`.
- 미들웨어 `middleware.ts`: matcher는 `_next/static`·`_next/image`·`favicon.ico`·이미지 확장자를 뺀 모든 경로.

## 5. 데이터

- Supabase Auth 사용자(`app_metadata.is_admin`, `user_metadata`).
- `public.users.is_admin`, SQL 함수 `public.is_admin()`(RLS 정책이 쓴다). 둘 다 기본 스키마라 저장소의 마이그레이션에 없다(§7).
- 환경변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## 6. 불변식

- 2 관리자 판정은 서버가 확인한 세션으로만: **현행 코드가 위반한다(§7 1·2).**
- 6 비밀값은 서버에만: service role 키는 `lib/supabase/service.ts`에서만 읽고, `getSupabaseEnv`는 클라이언트에서도 import되지만 `SUPABASE_SERVICE_ROLE_KEY`는 브라우저 번들에서 `undefined`다.

## 7. 미결·확인 필요

1. **요청 헤더 위조로 관리자 우회(심각).** `getCurrentUser`는 요청 헤더 `x-user-id`를, `isAdminDb`는 요청 헤더 `x-user-is-admin`을 믿는다. 미들웨어는 이 값을 응답 헤더에만 넣고 요청 헤더는 클라이언트가 보낸 그대로 넘기므로, 누구나 `x-user-id: <아무 값>`과 `x-user-is-admin: true`를 붙이면 `requireAdmin`을 통과한다. 영향: 비공개 이미지 조회·업로드(images), 글·카테고리 쓰기와 삭제(posts·categories, service role로 RLS 우회), 관리자 화면 접근.
2. **`user_metadata.is_admin` 신뢰(심각).** `user_metadata`는 로그인한 사용자가 `supabase.auth.updateUser({ data: … })`로 스스로 바꿀 수 있다. 회원가입이 열려 있으므로 누구나 가입 후 `is_admin: true`를 넣어 관리자가 된다. `isAdminDb`와 미들웨어가 모두 이 값을 본다. RLS의 `is_admin()` 정의는 저장소에 없어 확인할 수 없다.
3. 미들웨어가 붙이는 `x-user-id`·`x-user-email`은 응답 헤더라 브라우저로 나간다. 의도한 성능 최적화(서버 컴포넌트로 전달)는 동작하지 않고 사용자 식별자만 노출된다.
4. 열린 리다이렉트: 로그인 폼의 `from`과 콜백의 `next`를 `/`로 시작하는지만 본다. `//evil.example`이면 외부로 이동한다.
5. Next 16에서 `middleware` 파일 이름이 폐기 예정이다(빌드 경고: `proxy`로 바꾸라는 안내).
6. `public.users`·`is_admin()`·기본 RLS·Storage 버킷을 만드는 기본 스키마 마이그레이션이 저장소에 없다. Supabase 프로젝트를 새로 만들면 재현할 수 없다.

## 8. 관련 코드

- 관리자 전용 서버 액션·라우트(posts·categories·images 명세)가 첫 줄에서 `requireAdmin`을 부른다.
- 모든 상세·목록 화면(article·feed·diary·site 명세)이 `getCurrentUser`·`isAdminDb`로 관리자 메뉴와 비공개 글 표시를 정한다.
- `lib/actions/comments.ts`(comments 명세)는 `auth.getUser()`로 사용자를 직접 확인하지만 관리자 여부는 `isAdminDb`로 판정한다.
