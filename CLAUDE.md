# myblog 개발 규칙

개인 블로그(w-life, https://www.w-life.store) 저장소의 프로젝트 규칙이다. 응답 형식·브리핑·일반 코딩 원칙은 글로벌 `~/.claude/CLAUDE.md`를 따르고, 충돌하면 이 문서가 우선한다. 다른 에이전트용 `AGENTS.md`는 이 문서를 가리킨다.

## 0. 정본 문서

같은 사실은 한 문서에만 쓰고 나머지는 링크한다.

| 문서 | 내용 |
|---|---|
| [로드맵](docs/plans/roadmap.md) | 단계·진행 현황·결정 필요 항목·발견 사항 |
| [INVARIANTS](docs/INVARIANTS.md) | 불변식 7개 |
| `docs/specs/*.md` | 기능 명세(시나리오·계약·데이터). 형식은 [`_template.md`](docs/specs/_template.md) |
| [README](README.md) | 실행·환경변수·배포 온보딩 |

- 동작·권한·데이터 규칙을 바꾼 작업은 해당 명세를 고쳐야 끝난다.

## 1. 제품 규칙 (요약)

정본은 [INVARIANTS](docs/INVARIANTS.md)와 명세다.

- 글 타입: `blog`(화면 이름 "아티클", `/article`), `feed`(`/feed`, 상세 화면 없음), `diary`(`/diary`).
- 공개 범위: `public`·`private`(글·카테고리 단위). 피드는 항상 `public`.
- 쓰기(글·카테고리·이미지)는 관리자 한 명만 한다. 댓글은 로그인 사용자가 쓰고, 다이어리는 댓글이 없다. 대댓글은 한 단계다.
- 경로 타입과 글 타입이 다르면 404다.

## 2. 금지선

- 사용자의 미커밋·스테이징 변경을 `git restore`·`checkout`·`stash`로 치우지 않는다.
- 비밀값(`.env*`, 키)을 출력하거나 쓰거나 커밋하지 않는다. 변수 이름만 `.env.example`에 적는다.
- `supabase/migrations/`의 커밋된 SQL을 고치거나 지우지 않는다(편집·커밋 가드가 막는다).
- `git push`는 Vercel 운영 배포다(main push = 배포). 사용자가 요청할 때만 한다. 히스토리 수정(`amend`·`rebase`·`reset`)도 요청할 때만 한다.
- `--no-verify`로 git 훅을 건너뛰지 않는다.
- 덧방 금지: 옛 코드 위에 어댑터·별칭을 덧대지 않는다. 호출부를 바꾸고 옛 것을 지운다(MongoDB 전환에도 적용).
- Supabase 대시보드·Vercel 설정처럼 외부 운영 상태를 바꾸는 일은 절차를 정리해 사용자에게 넘긴다.

## 3. 개발 흐름: 명세 → 테스트 → 구현 (SDD + TDD)

1. **명세**: `spec` 스킬로 `docs/specs/<기능>.md`를 쓰거나 고친다(상태 `초안`). 사용자가 대화에서 명시적으로 승인하면 `승인`과 날짜를 적는다. **승인 없이 상태를 바꾸지 않는다.**
2. **테스트**: `implement` 스킬로 시나리오마다 실패하는 테스트를 먼저 쓰고 기대한 이유로 실패하는지 확인한다. 제목은 `<시나리오 ID> <한국어 설명>`이다.
3. **구현**: 테스트를 통과시키는 최소 코드 → 정리 → 규약 점검.
4. **마감**: 모든 시나리오에 테스트가 있으면 명세를 `완료`, 남으면 `현행`으로 바꾼다.

- 지금 운영 중인 기능은 모두 `현행` 명세(운영 코드 역작성)가 있다. 현행 명세의 동작을 바꾸려면 명세를 먼저 고쳐 승인받는다. 명세대로 동작하지 않는 버그는 명세를 두고 회귀 테스트에 그 시나리오 ID를 붙인다.
- 실용적 TDD: `lib/` 로직·라우트 핸들러·미들웨어는 테스트 먼저(편집 가드가 강제한다). 화면(`.tsx`)은 상태 전환·데이터 변환이 있을 때 컴포넌트 테스트를 쓰고, 순수 마크업·스타일은 수동 확인으로 둔다.
- 단계 단위 진행은 `roadmap` 스킬, 커밋은 `commit` 스킬이 맡는다.

### 하네스

| 장치 | 위치 | 하는 일 |
|---|---|---|
| 편집 가드 (PreToolUse) | `.claude/hooks/edit-guard.mjs` | 비밀값·커밋된 마이그레이션 편집과 명세 밖 소스 편집을 막는다. 테스트 먼저 대상은 관련 테스트(이름 짝 `x.test.ts` 또는 그 명세의 시나리오 ID)가 먼저 바뀌어 있어야 고친다. 명세가 덮는 소스를 처음 고칠 때 명세를 알린다 |
| TDD 훅 (PostToolUse·Stop) | `.claude/hooks/tdd-harness.mjs` | 편집마다 `vitest related`를 돌려 실패를 `[TDD 피드백]`으로 돌려준다. 실패가 남으면 턴 종료를 막고(최대 3회), 관련 테스트 없이 로직만 고쳤으면 한 번 멈춰 회귀 테스트나 생략 사유를 요구한다 |
| 세션 맥락 (SessionStart) | `.claude/hooks/session-context.mjs` | 새 세션·압축 뒤 다음 단계·진행 중 명세·테스트 부채를 알린다 |
| 커밋 가드 (git pre-commit·commit-msg) | `tooling/harness/commit-guard.mjs`, `tooling/git-hooks/` | 편집 가드 규칙 재검사(Bash 편집 포함), 비밀값(JWT·`sb_secret_`·접속 URL 비밀번호), 한국어가 아닌 테스트 제목·`.only`, 새 `as any`·`as unknown as`·`@ts-ignore`, 사유 없는 `eslint-disable`, 테스트 없는 로직 커밋, 커밋 메시지 형식, 테스트 없는 시나리오가 남은 완료 명세를 막는다. 스테이징된 TS가 있으면 eslint·tsc도 돌린다 |
| 명세 검사 | `npm run spec:check` | 명세 형식, 시나리오 ↔ 테스트 연결, 모든 소스가 명세 정확히 하나에 속하는지 확인한다 |

- 소스 = `app/`·`lib/`의 TS 파일과 `middleware.ts`·`proxy.ts`(테스트·선언 제외). 테스트 먼저 대상 = `lib/`의 `.ts`(`types.ts`·`constants.ts`·`lib/supabase/` 제외), `app/**/route.ts`, `middleware.ts`·`proxy.ts`.
- 예외: 동작이 바뀌지 않는 이동·이름 변경·로그·주석 수정만 `.claude/guard-exempt.local`에 사유 한 줄(60분 유효, 끝나면 지운다), 커밋 본문에 `TDD-Exempt: 사유`. 비밀값·커밋된 마이그레이션은 예외가 없다.
- git 훅은 `npm install`(prepare) 또는 `npm run setup:hooks`로 켠다. 하네스를 바꾸면 `npm run test:tooling`을 돌린다.

## 4. 검증과 완료 기준

- 반복 중: 고친 파일의 테스트(`npx vitest run <파일>`)와 `npm run typecheck`만 돌린다.
- 커밋·보고 전: `npm run lint && npm run typecheck && npm test && npm run spec:check`. 하네스를 바꿨으면 `npm run test:tooling`을 더한다.
- `npm run build`는 sitemap 프리렌더가 DB에 접속하므로 DB가 살아 있어야 통과한다. 접속 불가로 실패하면 그 사실을 그대로 보고한다.
- 완료 = 동작 확인 + 권한·타입 규칙 위반 없음 + 위 검사 통과 + 명세 상태 갱신 + 로드맵 체크 + 한국어 Conventional Commit(사용자 요청 시).
- 결과는 그대로 보고한다. 실패하거나 건너뛴 검사를 숨기지 않는다.

## 5. 명령어

```bash
npm run dev                                  # http://localhost:2025
npm test                                     # vitest run (전체)
npx vitest run lib/markdown.test.ts          # 파일 하나
npx vitest related lib/markdown.ts --run     # 그 파일을 import하는 테스트만
npm run lint && npm run typecheck            # eslint, tsc --noEmit
npm run spec:check                           # 명세 검사·테스트 부채 보고
npm run test:tooling                         # 하네스·훅 자체 테스트(node --test)
npm run build                                # next build --webpack (Turbopack 제한으로 고정)
```

## 6. 아키텍처 (현행: Supabase → MongoDB 전환 예정, 로드맵 3단계)

- Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4(`@tailwindcss/postcss`, typography), CKEditor 5(본문은 HTML로 저장), next-themes, sonner, framer-motion. 경로 별칭 `@/*`는 저장소 루트다.
- **조회**
  - 공개 목록(홈·아티클 목록·sitemap): `lib/server/publicPosts.ts`가 anon 키로 PostgREST를 `fetch`하고 태그 캐시(`posts:public:<type>`, `posts:public:blog:category:<slug>`)를 건다.
  - 그 밖의 조회: `lib/server/posts.ts`가 쿠키 세션 서버 클라이언트(RLS 적용)로 읽는다. 비관리자 다이어리 목록만 service role로 읽고 본문을 지운다.
- **쓰기**: `lib/actions/*.ts` 서버 액션(`"use server"`). 반환은 `{ success: true, … } | { success: false, error }` 판별 유니온이고, 성공하면 `revalidateTag`·`revalidatePath`로 공개 캐시를 무효화한다.
- **이미지**: `app/api/images` 라우트 핸들러(nodejs runtime)가 service role로 Storage에 올리고 내려준다. 키 형식은 `<버킷>:<경로>`(`post-images-public`·`post-images-private`).
- **Supabase 클라이언트**

  | 함수 | 위치 | 쓰는 곳 | 특징 |
  |---|---|---|---|
  | `createSupabaseServerClient` | `lib/supabase/server.ts` | 서버 컴포넌트·서버 액션·라우트 핸들러 | 쿠키 세션, RLS 적용 |
  | `createSupabaseBrowserClient` | `lib/supabase/client.ts` | 클라이언트 컴포넌트(로그인·로그아웃) | 브라우저 세션, RLS 적용 |
  | `createSupabaseServiceClient` | `lib/supabase/service.ts` | 서버 전용 관리자 작업 | RLS 우회. `requireAdmin` 뒤에만 |

- **인증**: Supabase Auth(이메일·비밀번호). `middleware.ts`가 `sb-` 쿠키가 있을 때만 세션을 갱신한다. 관문은 `lib/server/admin.ts`의 `requireLogin`·`requireAdmin`이다. 관리자 판정에 현행 결함이 있다([auth 명세](docs/specs/auth.md) §7).
- **ISR**: 라우트 세그먼트 `revalidate`는 리터럴이어야 하므로 `86400 // REVALIDATE_PERIOD`로 쓴다. `getCurrentUser`가 `headers()`를 읽는 페이지는 동적 렌더링된다.
- **DB 스키마**: `supabase/migrations/`에는 추가 변경만 있고 기본 스키마(테이블·`is_admin()`·기본 RLS·Storage 버킷)가 없다.
- **배포**: Vercel. main push가 운영 배포다. 환경변수는 `.env.example`.

## 7. 규약

- 식별자·코드는 영어, 주석·화면 문구·테스트 제목은 한국어. 주석은 "왜"만 쓴다.
- 새 `any`·`as unknown as`·`@ts-ignore`를 쓰지 않는다. `eslint-disable`에는 `-- 사유`를 붙인다.
- 입력 검증은 경계(서버 액션·라우트 핸들러)에서 zod로 한다. 내부 로직에 `try-catch`·중복 null 검사를 늘어놓지 않는다.
- RSC 우선: `"use client"`는 브라우저 API·상태가 필요한 말단 컴포넌트에만 쓴다. 서버 전용 모듈은 `import "server-only"`.
- 조회는 필요한 열만 고르고, 관계 count(`comments(count)`)로 N+1을 피한다.
- 줄 수를 줄이려고 helper·utils 껍데기 파일로 쪼개지 않는다.
- UI: Tailwind v4 문법(`bg-linear-to-*` 등), 디자인 토큰은 `app/globals.css`. 다크 모드와 모바일 폭을 확인하고, 버튼·링크에는 hover·transition을 둔다.
- 테스트: 소스 옆 `<이름>.test.ts(x)`. 외부(Supabase 클라이언트, `next/headers`·`next/navigation`·`next/cache`)는 `vi.mock`으로 바꾼다. 화면 테스트는 첫 줄에 `// @vitest-environment jsdom`.

## 8. 불변식 (색인)

정본은 [INVARIANTS](docs/INVARIANTS.md)다.

1. 비공개 격리
2. 관리자 판정은 서버가 확인한 세션으로만 (현행 위반, 로드맵 2단계)
3. 글 타입 규칙
4. 쓰기는 관리자만, 댓글은 로그인 사용자
5. 공개 캐시 정합성
6. 비밀값은 서버에만
7. 마이그레이션은 추가만
