# myblog 개발 규칙

개인 블로그(w-life, https://www.w-owen.com). 남은 일은 [작업 목록](docs/plans/00-작업목록.md)에 한 줄씩 있다. 단계별 계획·결과와 알려진 문제는 [로드맵](docs/plans/roadmap.md)의 번호 절에 있고(주석의 "로드맵 N절"), 1,600줄이 넘으니 필요한 절만 찾아 읽는다.

## 제품 규칙

- 글 타입: `blog`(화면 이름 "아티클", `/article`), `feed`(`/feed`, 상세 화면 없음), `diary`(`/diary`).
- 공개 범위: `public`·`private`(글·카테고리 단위). 피드는 항상 `public`. 비공개 글·이미지·다이어리 본문은 관리자 외에는 어떤 경로(목록·상세·이미지·sitemap·공개 캐시)로도 보여 주지 않는다. 의도한 예외가 둘 있고 버그가 아니다. 방문자 다이어리 목록은 비공개 일기의 날짜와 slug를 제목 "일기"로 내보내고 slug마다 안내 화면을 만든다(달력에 일기를 쓴 날이 드러나고, 제목·본문은 나가지 않는다). 비공개 카테고리의 `public` 글은 방문자에게 보이지 않지만 이미지는 공개 버킷에 남는다(버킷은 글의 공개 범위만 본다, 로드맵 19절).
- 쓰기(글·카테고리·이미지)는 관리자만 한다. 댓글 화면은 아티클 상세뿐이다. 공개 글의 댓글은 누구나 읽고 로그인 사용자가 쓴다. 비공개 글의 댓글은 관리자만 읽고 쓰고, 비공개 카테고리 글의 댓글은 RLS가 관리자까지 막는다. 피드는 댓글 화면이 없고 다이어리는 댓글이 없다. 대댓글은 한 단계다.
- 경로 타입과 글 타입이 다르면 404다.

## 금지선

- 사용자의 미커밋·스테이징 변경을 `git restore`·`checkout`·`stash`로 치우지 않는다.
- 비밀값(`.env*`)을 읽거나 쓰거나 커밋하지 않는다(`.claude/settings.json`이 읽기·쓰기를 막는다). 변수 이름만 `.env.example`에 적는다.
- `git push`는 Vercel 운영 배포다. 사용자가 요청할 때만 한다. `--no-verify`와 히스토리 수정(`amend`·`rebase`·`reset`)도 요청할 때만.
- `supabase/migrations/`의 커밋된 SQL은 고치지 않고 새 파일로 추가한다.
- Supabase 프로젝트는 둘이다. MCP로 DB를 다룰 때 기본 대상은 개발 `myblog-dev`(`admadefdkybuvklpezht`)이고, 운영 `myblog`(`mgyoglaujbxfbuxxlcfj`)에는 읽기 전용 조회와 사용자가 확인한 마이그레이션 적용만 한다.

## 작업 방식

- 요청 범위만 바꾼다. 인접 코드·주석·포맷은 건드리지 않고 기존 스타일을 따른다.
- 관련 없는 죽은 코드는 지우지 말고 알린다. 내 변경으로 안 쓰이게 된 import·변수·함수만 지운다.
- 요청하지 않은 기능, 한 번만 쓰는 추상화, 요청 없는 설정 옵션, 일어날 수 없는 경우의 예외 처리는 넣지 않는다. 더 단순한 방법이 있으면 먼저 말한다.
- 해석에 따라 결과가 크게 달라질 때만 구현 전에 묻는다. 그 외에는 가정을 밝히고 진행한다.
- 완료를 말할 때는 실행한 확인 명령과 결과를 함께 적는다.
- 큰 기능·구조 변경은 로드맵에 새 번호 절로 짧은 계획을 쓰고 확인받은 뒤 구현하고, 작업 목록에 한 줄을 더한다. 끝나면 작업 목록의 줄을 지우고 로드맵에 결과를 남긴다.
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

- Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4, next-themes, sonner, lucide-react. 경로 별칭 `@/*`는 저장소 루트다.
- 영역별 구조·함정은 그 영역 파일을 다룰 때 자동으로 읽히는 `.claude/rules/`에 있다. 아직 파일을 열지 않은 영역을 계획할 때는 해당 파일을 직접 읽는다.
  - `editor.md`: 본문 렌더링·본문 규격·글 쓰기 화면·에디터
  - `pages.md`: 공개 화면·ISR·검색·다이어리·조회수·피드 카드·RSS·관리자 draft mode·방명록·마이페이지
  - `server.md`: 서버 액션·캐시 무효화·이미지·카테고리·쓰기 횟수 제한·메일 알림·Supabase 클라이언트·DB 타입·인증
- 어느 영역에서든 지키는 불변식(자세한 내용은 위 파일):
  - 공개 화면은 쿠키를 읽지 않아 정적·ISR이다. 공개 페이지에서 `getViewer()`를 직접 부르지 않고 `getPreviewViewer()`를 쓴다.
  - 본문 렌더러는 `lib/markdown.ts`의 `renderMarkdown` 하나이고 `html: false`가 XSS 방어다. 클라이언트 컴포넌트에서 import하지 않는다.
  - `lib/supabase/service.ts`(RLS 우회)는 `assertAdmin` 뒤에만 쓴다. 예외 넷은 `server.md`에 있다.
  - 글 화면과 작성 칸은 `app/globals.css`의 `--md-*` 한 벌을 같이 쓴다. 한쪽 모양을 바꾸면 두 곳을 같이 고친다.

## 규약

- 식별자·코드는 영어, 주석·화면 문구·테스트 제목은 한국어. 주석은 "왜"만 쓴다.
- 새 `any`·`@ts-ignore`를 쓰지 않는다. 입력 검증은 서버 액션·라우트 핸들러 경계에서 zod로 한다.
- RSC 우선: `"use client"`는 브라우저 API·상태가 필요한 말단 컴포넌트에만. 서버 전용 모듈은 `import "server-only"`.
- 조회는 필요한 열만 고르고 관계 count(`comments(count)`)로 N+1을 피한다.
- UI: Tailwind v4 문법(`bg-linear-to-*` 등), 디자인 토큰은 `app/globals.css`. 상태 색은 `success`·`warning`·`danger` 토큰, 버튼은 `ui.tsx`의 `Button`·`ButtonLink`·`buttonClass`, 아이콘은 lucide-react, 클래스 조합은 `cn`이다. `dark:`는 OS 설정이 아니라 html의 `.dark`를 따른다. 다크 모드와 모바일 폭을 확인한다.
