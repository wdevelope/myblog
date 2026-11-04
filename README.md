# myblog

Next.js(App Router) + Tailwind CSS 기반 개인 블로그(w-life). 배포는 Vercel이다.

- 글 타입: `blog`(아티클) / `feed` / `diary`
- 공개 범위: `public` / `private` (글 단위, 피드는 항상 공개)
- 댓글: 누구나 읽고 로그인 사용자가 쓴다, `diary`는 미지원
- 이미지 첨부: 모든 글 타입 지원(SVG 제외)
- 본문: 마크다운. 에디터는 툴바 + 라이브 프리뷰(작성 칸에 바로 서식이 보이고 커서가 있는 줄만 기호가 보인다)이고, 형광펜 `==텍스트==`·밑줄 `++텍스트++`·수식 `$…$`·`$$…$$`(KaTeX)를 지원한다
- 데이터: Supabase(Postgres·Auth·Storage)

에이전트 작업 규칙은 [CLAUDE.md](CLAUDE.md)를 본다.

## 시작하기

### 1) 환경 변수

[`.env.example`](.env.example)을 참고해 두 파일을 만든다.

- `.env`: 운영 Supabase(`myblog`) 값. `npm run build`가 쓴다.
- `.env.development.local`: 개발 Supabase(`myblog-dev`) 값. `npm run dev`는 이 파일을 `.env`보다 먼저 읽어 개발 프로젝트에 붙는다.

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (필수)
- `SUPABASE_SERVICE_ROLE_KEY` (필수, 서버 전용: 관리자 쓰기·비공개 이미지)
- `NEXT_PUBLIC_SITE_URL` (선택, 기본 `https://www.w-owen.com`: 메타데이터·sitemap·robots 기준 URL)
- `CRON_SECRET` (운영 필수: Vercel Cron `/api/cron/keep-alive` 인증. Supabase 무료 플랜 일시정지 방지)

### 개발 DB

운영(`myblog`)과 개발(`myblog-dev`)은 서로 다른 Supabase 프로젝트다(DB·Auth·Storage 모두 따로, 둘 다 서울 리전).

- 구조: `supabase/migrations/`가 원본이다. 새 마이그레이션은 개발 프로젝트에 먼저 적용해 확인하고 운영에 적용한다.
- 데이터: `supabase/seed.sql`(가짜 글·카테고리·댓글)을 개발 프로젝트의 SQL Editor에서 실행한다. 운영에는 넣지 않는다.
- 테스트 계정: 개발 프로젝트 대시보드 Authentication → Add user(Auto Confirm)로 관리자·일반 계정을 만들고, 관리자는 SQL Editor에서 `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"is_admin": true}' where email = '<이메일>';` 뒤 다시 로그인한다. 계정을 만든 뒤 seed를 다시 실행하면 댓글이 채워진다.
- 개발 프로젝트는 7일 동안 쓰지 않으면 일시정지된다. 대시보드에서 다시 켜면 데이터는 그대로다.
- 개발 서버(`npm run dev`)는 운영 프로젝트 주소로는 시작하지 않는다. `.env.development.local`에 개발 프로젝트 값을 넣는다. 운영 데이터로 볼 때는 `npm run build` 뒤 `next start`를 쓴다.

### 2) 실행

```bash
npm install
npm run dev          # http://localhost:2025
```

## 주요 라우트

- 공개(정적·ISR): `/`, `/article`, `/article/page/[n]`, `/article/category/[slug]`(`/page/[n]`), `/article/[slug]`, `/feed`, `/diary`, `/diary/[slug]`
- 관리자: `/article/write`, `/article/edit/[slug]`, `/feed/write`, `/feed/edit/[slug]`, `/diary/write`, `/diary/edit/[slug]`
- 인증: `/login`(로그인·회원가입), `/auth/callback`. 로그아웃은 브라우저 Supabase 클라이언트의 `signOut()`으로 한다
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
