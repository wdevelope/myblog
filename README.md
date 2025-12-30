# myblog

Next.js(App Router) + Tailwind CSS 기반 개인 블로그.

- 글 타입: `blog` / `feed` / `diary`
- 공개 범위: `public` / `private` (글 단위 선택)
- 댓글: `blog/feed`만 지원, `diary`는 미지원
- 이미지 첨부: 모든 글 타입 지원
- 인증: Supabase Auth (Email/Password)

> 현재는 **Next.js Route Handlers + Supabase(Postgres/Storage/Auth)** 기반으로 동작합니다.  
> 배포는 Vercel을 사용합니다.

## Getting Started

### 1) 환경 변수 준비

`.env.local`을 만들고 `/.env.example`을 참고해 값을 채워주세요.

필수:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (서버 전용: admin-only/private 이미지 signed URL 등에 사용)

선택:

- `NEXT_PUBLIC_API_BASE_URL` (미설정 시 자동으로 같은 origin의 `/api`를 사용)

### 2) 실행

```bash
npm i
npm run dev
```

브라우저에서 `http://localhost:3000` 접속.

## 주요 라우트

- 공개 섹션: `/`, `/article`, `/feed`
- 보호 섹션(admin 필요): `/diary`, `/article/write`, `/feed/write`, `/diary/write`
- 인증: `/login` (로그인/회원가입), `/logout` (로그아웃)

## 로컬 목업 API

- `GET /api/posts?type=blog|feed|diary`
- `POST /api/posts` (admin 필요)
- `GET /api/posts/[slug]`
- `GET /api/comments?postId=...` (로그인 필요)
- `POST /api/comments` (`diary`는 불가, 로그인 필요)
- `GET /api/images?bucket=...&path=...` (admin 전용 signed URL 리다이렉트)
- `POST /api/images` (admin 전용 이미지 업로드: `multipart/form-data`)

## 빌드/검증

```bash
npm run lint
npm run build
```

> 참고: 현재 실행 환경에서 Turbopack이 제한(os error 1)될 수 있어 `build`는 `webpack`으로 고정되어 있습니다.

## 배포(Vercel)

- Vercel에 Git 리포지토리 연결
- Project Settings → Environment Variables에 `.env.example` 항목 설정
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`는 Vercel 환경변수로 반드시 설정
