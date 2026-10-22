# myblog 개발 규칙

개인 블로그(w-life, https://www.w-owen.com). 응답 형식·브리핑·일반 코딩 원칙은 글로벌 `~/.claude/CLAUDE.md`를 따르고, 충돌하면 이 문서가 우선한다. 진행 현황과 알려진 문제는 [로드맵](docs/plans/roadmap.md)에 있다.

## 제품 규칙

- 글 타입: `blog`(화면 이름 "아티클", `/article`), `feed`(`/feed`, 상세 화면 없음), `diary`(`/diary`).
- 공개 범위: `public`·`private`(글·카테고리 단위). 피드는 항상 `public`. 비공개 글·이미지·다이어리 본문은 관리자 외에는 어떤 경로(목록·상세·이미지·sitemap·공개 캐시)로도 보여 주지 않는다.
- 쓰기(글·카테고리·이미지)는 관리자만 한다. 댓글은 누구나 읽고 로그인 사용자가 쓴다. 다이어리는 댓글이 없다. 대댓글은 한 단계다.
- 경로 타입과 글 타입이 다르면 404다.

## 금지선

- 사용자의 미커밋·스테이징 변경을 `git restore`·`checkout`·`stash`로 치우지 않는다.
- 비밀값(`.env*`)을 읽거나 쓰거나 커밋하지 않는다(`.claude/settings.json`이 읽기·쓰기를 막는다). 변수 이름만 `.env.example`에 적는다.
- `git push`는 Vercel 운영 배포다. 사용자가 요청할 때만 한다. `--no-verify`와 히스토리 수정(`amend`·`rebase`·`reset`)도 요청할 때만.
- `supabase/migrations/`의 커밋된 SQL은 고치지 않고 새 파일로 추가한다.
- Supabase 프로젝트는 둘이다. MCP로 DB를 다룰 때 기본 대상은 개발 `myblog-dev`(`admadefdkybuvklpezht`)이고, 운영 `myblog`(`mgyoglaujbxfbuxxlcfj`)에는 읽기 전용 조회와 사용자가 확인한 마이그레이션 적용만 한다.

## 작업 방식

- 큰 기능·구조 변경은 로드맵에 짧은 계획을 쓰고 확인받은 뒤 구현한다.
- 로직(`lib/`·라우트 핸들러·미들웨어)을 바꾸면 테스트를 같이 쓴다. 버그는 재현 테스트를 먼저 쓰고 실패를 확인한 뒤 고친다. 화면 마크업·스타일은 테스트 대신 브라우저로 확인한다.
- 테스트는 소스 옆 `<이름>.test.ts(x)`, 제목은 한국어다. Supabase 클라이언트와 `next/headers`·`next/navigation`·`next/cache`는 `vi.mock`으로 바꾼다. 화면 테스트는 첫 줄에 `// @vitest-environment jsdom`.
- 끝내기 전에 `npm run lint && npm run typecheck && npm test`. `npm run build`는 DB에 접속해야 통과하므로, 접속 불가로 실패하면 그대로 보고한다.
- 커밋은 `commit` 스킬로 한다(한국어 Conventional Commit).
- DB 구조 변경: `supabase/migrations/`에 새 파일을 쓰고, Supabase MCP `apply_migration`으로 개발 프로젝트에 먼저 적용해 확인한 뒤 사용자 확인을 받고 운영에 적용한다. 개발용 가짜 데이터는 `supabase/seed.sql`이다(운영에는 넣지 않는다).

## 명령어

```bash
npm run dev                            # http://localhost:2025
npm test                               # vitest run
npx vitest run lib/markdown.test.ts    # 파일 하나
npm run lint && npm run typecheck
npm run build                          # next build --webpack (Turbopack 제한으로 고정)
```

## 구조

- Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4, next-themes, sonner. 경로 별칭 `@/*`는 저장소 루트다.
- 본문: 마크다운으로 저장한다. 렌더링은 `lib/markdown.ts`의 `renderMarkdown`(markdown-it, `html: false` + 형광펜 `==`·밑줄 `++`·수식 KaTeX) 하나이고, 화면은 `MarkdownContent`로 그린다. raw HTML을 끄는 것이 본문 XSS 방어이므로 `html: true`나 `rehype-raw`류로 바꾸지 않는다. 클라이언트 컴포넌트에서 렌더러를 import하지 않는다(공개 번들에 markdown-it·KaTeX가 실린다). 서버에서 만든 본문을 props로 넘긴다(예: `FeedCard`).
- 에디터: `MarkdownEditor`(CodeMirror 6 + 툴바, 미리보기 패널 없이 작성 칸에 바로 서식을 보인다). 작성 칸은 `lib/markdown-syntax.ts`(Lezer 파서, `==`·`++`·`$`)로 읽고 `lib/markdown-live-preview.ts`가 커서 밖 줄의 기호를 숨긴다. 글 화면 렌더러와 파서가 다르므로 본문 문법을 늘리면 두 곳에 같이 넣는다. 툴바 동작은 `lib/markdown-edit.ts`의 순수 함수다. 본문 이미지는 글의 공개 범위 버킷으로 올라가고 `![](<버킷>:<경로>)`로 들어간다. 크기·정렬은 주소 끝 조각(`#w=60&align=center`, `lib/image-options.ts`)에 담고, 렌더러는 검증한 값만 style·class로 옮긴다. 작성 칸 이미지는 누르면 선택되고 툴바·크기 손잡이가 뜬다(`lib/markdown-image-widget.ts`).
- 공개 화면(홈·아티클·피드·다이어리 목록과 상세, 댓글, sitemap)은 쿠키를 읽지 않아 정적·ISR이다. `lib/server/publicPosts.ts`가 anon 키로 PostgREST를 `fetch`하고 태그 캐시(`posts:public:<type>`, 하루)를 건다. 방문자 다이어리 목록만 service role로 본문 없이 읽어 `unstable_cache`한다(`getPublicDiaryIndex`).
- 관리자 화면: draft mode다. 관리자가 로그인하면 켜지고(`LoginForm`), 헤더 토글(`AdminModeToggle` → `lib/adminMode` → `/api/admin-mode`)로 끄고 다시 켠다(로그아웃 때 끄고, 글을 저장하면 켠다). draft 쿠키는 브라우저 세션 쿠키라 로그인이 남은 채 브라우저를 다시 열면 꺼져 있다. 상태는 `SiteHeader`가 `draftMode()`로 읽어 토글에 넘긴다(정적 생성 때는 false). 공개 페이지는 `getPreviewViewer()`로 draft mode일 때만 세션을 읽어 비공개 글·관리 버튼을 동적으로 그린다. 공개 페이지에서 `getViewer()`를 직접 부르지 않는다(정적이 깨진다).
- `/article` 목록은 경로 기반이다(`/article/page/[n]`, `/article/category/[slug]`, `/article/category/[slug]/page/[n]`, 링크는 `articleListHref`). 옛 `?category=`·`?page=` 주소는 `proxy.ts`가 308로 보낸다.
- 관리자 조회: `lib/server/posts.ts`가 쿠키 세션 서버 클라이언트(RLS 적용)로 읽는다.
- 쓰기: `lib/actions/*.ts` 서버 액션. 반환은 `{ success: true, … } | { success: false, error }`이고, 성공하면 `revalidatePublicPosts`로 공개 캐시(태그·경로)를 무효화한다. 댓글 쓰기·삭제도 그 글의 상세를 무효화한다. 태그는 `updateTag`로 바로 만료하므로 서버 액션에서만 부른다(`revalidateTag(tag, profile)`는 쓴 직후 첫 방문자에게 이전 내용을 준다). 목록 페이지가 route group 안에 있어 `revalidatePath`는 `type` 없이 주소로 부른다.
- 이미지: `app/api/images` 라우트 핸들러가 service role로 Storage에 올리고 내려준다. 키 형식은 `<버킷>:<경로>`. 비공개 버킷 응답은 `Cache-Control: private, no-store`이고, SVG는 올리지 않는다.
- Supabase 클라이언트: `lib/supabase/server.ts`(서버, RLS 적용), `client.ts`(브라우저), `service.ts`(서버 전용, RLS 우회 — `requireAdmin` 뒤에만. 예외: 방문자 다이어리 목록의 본문 없는 조회).
- 인증: Supabase Auth(이메일·비밀번호). 관문은 `lib/server/admin.ts`다. 화면 분기는 `getViewer()`(user·isAdmin), 페이지 접근은 `requireLogin`·`requireAdmin`(redirect), 서버 액션·라우트 핸들러는 `assertAdmin()`(실패를 돌려줌). 관리자는 `app_metadata.is_admin`(JSON `true`)만 보고, RLS의 `is_admin()`도 JWT의 같은 값을 본다. 관리자 지정은 SQL Editor(service role)로 `auth.users.raw_app_meta_data`에 `is_admin: true`를 넣고 다시 로그인한다(RLS는 토큰이 갱신돼야 반영). `proxy.ts`는 `sb-` 쿠키가 있을 때 세션 갱신만 한다.
- ISR: 라우트 세그먼트 `revalidate`는 리터럴이어야 하므로 `86400 // REVALIDATE_PERIOD`로 쓴다.
- 일시정지 방지: `/api/cron/keep-alive`(Vercel Cron 하루 1회, `CRON_SECRET`)가 캐시하지 않는 조회로 DB 활동을 남긴다(무료 플랜 7일 무활동 일시정지).

## 규약

- 식별자·코드는 영어, 주석·화면 문구·테스트 제목은 한국어. 주석은 "왜"만 쓴다.
- 새 `any`·`@ts-ignore`를 쓰지 않는다. 입력 검증은 서버 액션·라우트 핸들러 경계에서 zod로 한다.
- RSC 우선: `"use client"`는 브라우저 API·상태가 필요한 말단 컴포넌트에만. 서버 전용 모듈은 `import "server-only"`.
- 조회는 필요한 열만 고르고 관계 count(`comments(count)`)로 N+1을 피한다.
- UI: Tailwind v4 문법(`bg-linear-to-*` 등), 디자인 토큰은 `app/globals.css`. 다크 모드와 모바일 폭을 확인한다.
