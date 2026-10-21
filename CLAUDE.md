# myblog 개발 규칙

개인 블로그(w-life, https://www.w-life.store). 응답 형식·브리핑·일반 코딩 원칙은 글로벌 `~/.claude/CLAUDE.md`를 따르고, 충돌하면 이 문서가 우선한다. 진행 현황과 알려진 문제는 [로드맵](docs/plans/roadmap.md)에 있다.

## 제품 규칙

- 글 타입: `blog`(화면 이름 "아티클", `/article`), `feed`(`/feed`, 상세 화면 없음), `diary`(`/diary`).
- 공개 범위: `public`·`private`(글·카테고리 단위). 피드는 항상 `public`. 비공개 글·이미지·다이어리 본문은 관리자 외에는 어떤 경로(목록·상세·이미지·sitemap·공개 캐시)로도 보여 주지 않는다.
- 쓰기(글·카테고리·이미지)는 관리자만 한다. 댓글은 로그인 사용자가 쓰고, 다이어리는 댓글이 없다. 대댓글은 한 단계다.
- 경로 타입과 글 타입이 다르면 404다.

## 금지선

- 사용자의 미커밋·스테이징 변경을 `git restore`·`checkout`·`stash`로 치우지 않는다.
- 비밀값(`.env*`)을 읽거나 쓰거나 커밋하지 않는다(`.claude/settings.json`이 읽기·쓰기를 막는다). 변수 이름만 `.env.example`에 적는다.
- `git push`는 Vercel 운영 배포다. 사용자가 요청할 때만 한다. `--no-verify`와 히스토리 수정(`amend`·`rebase`·`reset`)도 요청할 때만.
- `supabase/migrations/`의 커밋된 SQL은 고치지 않고 새 파일로 추가한다.

## 작업 방식

- 큰 기능·구조 변경은 로드맵에 짧은 계획을 쓰고 확인받은 뒤 구현한다.
- 로직(`lib/`·라우트 핸들러·미들웨어)을 바꾸면 테스트를 같이 쓴다. 버그는 재현 테스트를 먼저 쓰고 실패를 확인한 뒤 고친다. 화면 마크업·스타일은 테스트 대신 브라우저로 확인한다.
- 테스트는 소스 옆 `<이름>.test.ts(x)`, 제목은 한국어다. Supabase 클라이언트와 `next/headers`·`next/navigation`·`next/cache`는 `vi.mock`으로 바꾼다. 화면 테스트는 첫 줄에 `// @vitest-environment jsdom`.
- 끝내기 전에 `npm run lint && npm run typecheck && npm test`. `npm run build`는 DB에 접속해야 통과하므로, 접속 불가로 실패하면 그대로 보고한다.
- 커밋은 `commit` 스킬로 한다(한국어 Conventional Commit).

## 명령어

```bash
npm run dev                            # http://localhost:2025
npm test                               # vitest run
npx vitest run lib/markdown.test.ts    # 파일 하나
npm run lint && npm run typecheck
npm run build                          # next build --webpack (Turbopack 제한으로 고정)
```

## 구조

- Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4, CKEditor 5(본문은 HTML로 저장), next-themes, sonner. 경로 별칭 `@/*`는 저장소 루트다.
- 공개 목록(홈·아티클 목록·sitemap): `lib/server/publicPosts.ts`가 anon 키로 PostgREST를 `fetch`하고 태그 캐시(`posts:public:<type>`)를 건다.
- 그 밖의 조회: `lib/server/posts.ts`가 쿠키 세션 서버 클라이언트(RLS 적용)로 읽는다.
- 쓰기: `lib/actions/*.ts` 서버 액션. 반환은 `{ success: true, … } | { success: false, error }`이고, 성공하면 `revalidateTag`·`revalidatePath`로 공개 캐시를 무효화한다.
- 이미지: `app/api/images` 라우트 핸들러가 service role로 Storage에 올리고 내려준다. 키 형식은 `<버킷>:<경로>`.
- Supabase 클라이언트: `lib/supabase/server.ts`(서버, RLS 적용), `client.ts`(브라우저), `service.ts`(서버 전용, RLS 우회 — `requireAdmin` 뒤에만).
- 인증: Supabase Auth(이메일·비밀번호). 관문은 `lib/server/admin.ts`의 `requireLogin`·`requireAdmin`이다(현행 결함은 로드맵 2단계).
- ISR: 라우트 세그먼트 `revalidate`는 리터럴이어야 하므로 `86400 // REVALIDATE_PERIOD`로 쓴다.

## 규약

- 식별자·코드는 영어, 주석·화면 문구·테스트 제목은 한국어. 주석은 "왜"만 쓴다.
- 새 `any`·`@ts-ignore`를 쓰지 않는다. 입력 검증은 서버 액션·라우트 핸들러 경계에서 zod로 한다.
- RSC 우선: `"use client"`는 브라우저 API·상태가 필요한 말단 컴포넌트에만. 서버 전용 모듈은 `import "server-only"`.
- 조회는 필요한 열만 고르고 관계 count(`comments(count)`)로 N+1을 피한다.
- UI: Tailwind v4 문법(`bg-linear-to-*` 등), 디자인 토큰은 `app/globals.css`. 다크 모드와 모바일 폭을 확인한다.
