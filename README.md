# w-life

직접 기획·디자인·개발·운영하는 개인 블로그입니다. **https://www.w-owen.com**

아티클·피드·다이어리 세 가지 글과 댓글·방명록을 다루고, 관리자는 같은 화면에서 바로 글을 쓰고 고칩니다. 공개 화면은 정적으로 빠르게, 비공개 글은 어떤 경로로도 새지 않게 만드는 것이 설계의 중심입니다.

## 주요 기능

- **글 세 종류**: 아티클(`/article`, 카테고리·페이지), 피드(`/feed`, 짧은 글), 다이어리(`/diary`, 한국 날짜 기준 달력)
- **공개 범위**: 글·카테고리 단위 `public`/`private`. 비공개 글·이미지·다이어리 본문은 관리자 외에는 목록·상세·이미지·sitemap·RSS·검색 어디에도 나오지 않는다
- **마크다운 에디터**: 작성 칸에 바로 서식이 보이는 라이브 프리뷰(CodeMirror 6), 형광펜 `==`·밑줄 `++`·수식 `$…$`(KaTeX), 이미지 크기·정렬 툴바, 임시저장
- **커뮤니티**: 댓글·한 단계 답글, 방명록(비밀글 지원), 마이페이지(닉네임·프로필 사진·내 댓글·비밀번호 변경·탈퇴), 관리자에게 댓글 메일 알림
- **그 밖에**: 공개 아티클 검색, 조회수, RSS, sitemap, OG 이미지, 다크 모드

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| 프레임워크 | Next.js 16 (App Router, React 19, Server Actions), TypeScript strict |
| 데이터 | Supabase (PostgreSQL, Row Level Security, Auth, Storage) |
| 에디터·렌더링 | CodeMirror 6 + Lezer 파서 확장, markdown-it, KaTeX |
| UI | Tailwind CSS v4, next-themes, lucide-react, sonner |
| 품질 | Vitest + Testing Library, ESLint, GitHub Actions CI |
| 배포·운영 | Vercel (ISR, Cron), Resend (메일 알림) |

## 설계 포인트

- **정적 공개 화면 + draft mode 관리자 화면**: 공개 페이지는 쿠키를 읽지 않아 정적·ISR로 나간다. 관리자는 draft mode로 같은 주소를 동적으로 보며 비공개 글과 관리 버튼을 함께 본다. 그래서 방문자 속도와 관리 편의를 둘 다 지킨다.
- **비공개 콘텐츠 격리**: 접근 규칙은 RLS에 두고(쓰기 정책마다 `WITH CHECK`), 관리자 판정은 사용자가 고칠 수 없는 `app_metadata`만 본다. 이미지는 공개·비공개 버킷으로 나누고, 글의 공개 범위가 바뀌면 저장할 때 파일을 맞는 버킷으로 옮긴다. 비공개 이미지 응답은 `private, no-store`라 공유 캐시에 남지 않는다.
- **본문 XSS 방어**: 마크다운을 raw HTML 없이(`html: false`) 렌더링하고, 이미지 크기·정렬 값은 검증한 것만 style·class로 옮긴다. 메일 알림에는 사용자 입력을 텍스트로만 넣는다.
- **쓰기 직후에도 최신**: 공개 목록은 태그 캐시를 쓰고, 서버 액션이 `updateTag`로 바로 만료시켜 글을 쓴 직후 첫 방문자도 새 목록을 받는다.
- **라이브 프리뷰 에디터**: Lezer 파서를 확장해 `==`·`++`·`$`를 읽고, 커서 밖 줄의 기호를 숨긴다. 글 화면 렌더러(markdown-it)와 파서가 달라 문법을 늘릴 때 두 곳을 함께 고치는 규칙을 둔다.
- **운영 안전장치**: 개발·운영 Supabase 프로젝트를 분리하고, 개발 서버는 운영 주소로는 시작하지 않는다. 무료 플랜 일시정지를 막는 Cron을 둔다.

## 품질

- 테스트 559개(Vitest, 59개 파일): 서버 액션·라우트 핸들러·공개 조회·에디터 순수 함수·화면 컴포넌트
- CI에서 lint·타입 검사·테스트를 돌린다(빌드는 DB 접속이 필요해 Vercel 배포가 맡는다)
- 큰 변경은 [로드맵](docs/plans/roadmap.md)에 계획과 결과를 남긴다(23단계). 에이전트 작업 규칙은 [CLAUDE.md](CLAUDE.md)에 있다.

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
