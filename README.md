# myblog

Next.js(App Router) + Tailwind CSS 기반 개인 블로그(w-life). 배포는 Vercel이다.

- 글 타입: `blog`(아티클) / `feed` / `diary`
- 공개 범위: `public` / `private` (글 단위, 피드는 항상 공개)
- 댓글: 로그인 사용자, `diary`는 미지원
- 이미지 첨부: 모든 글 타입 지원
- 데이터: Supabase(Postgres·Auth·Storage)

에이전트 작업 규칙은 [CLAUDE.md](CLAUDE.md)를 본다.

## 시작하기

### 1) 환경 변수

`.env.local`을 만들고 [`.env.example`](.env.example)을 참고해 값을 채운다.

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (필수)
- `SUPABASE_SERVICE_ROLE_KEY` (필수, 서버 전용: 관리자 쓰기·비공개 이미지)
- `NEXT_PUBLIC_SITE_URL` (선택, 기본 `https://www.w-life.store`: 메타데이터·sitemap·robots 기준 URL)

### 2) 실행

```bash
npm install
npm run dev          # http://localhost:2025
```

## 주요 라우트

- 공개: `/`, `/article`(`?category=`, `?page=`), `/article/[slug]`, `/feed`, `/diary`, `/diary/[slug]`
- 관리자: `/article/write`, `/article/edit/[slug]`, `/feed/write`, `/feed/edit/[slug]`, `/diary/write`, `/diary/edit/[slug]`
- 인증: `/login`(로그인·회원가입), `/auth/callback`, `/logout`
- 이미지: `GET /api/images?bucket=&path=`(비공개 버킷은 관리자), `POST /api/images`(관리자 업로드)
- 글·댓글·카테고리 쓰기는 서버 액션(`lib/actions/*.ts`)이다.

## 검증

```bash
npm run lint
npm run typecheck
npm test               # Vitest
npm run build          # DB에 접속할 수 있어야 sitemap 프리렌더가 통과한다
```

> 실행 환경에서 Turbopack이 제한(os error 1)될 수 있어 `build`는 webpack으로 고정되어 있다.

## 배포(Vercel)

- main 브랜치 push가 운영 배포다.
- Project Settings → Environment Variables에 `.env.example` 항목을 설정한다.
