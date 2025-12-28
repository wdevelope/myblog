# LLM 작업 지시서 (myblog)

이 문서는 `tasklist.md`와 추가 운영 규칙(커밋/완료체크)을 **하나로 통합한 지시서**입니다.  
이 저장소에서 LLM/에이전트가 작업할 때는 **항상 이 문서를 우선 준수**하고, 세부 단계는 `tasklist.md`를 소스 오브 트루스로 삼습니다.

---

## 1) 프로젝트 목표

- Next.js(App Router) 기반 개인 블로그 구축
- 섹션/콘텐츠 타입
  - `blog`: 카테고리 기반 글
  - `feed`: 짧은 글(타임라인)
  - `diary`: 일기장
- 글 단위 옵션
  - 공개 범위: `public` / `private` (모든 글에 적용)
  - 이미지 첨부: 모든 글 타입 지원
  - 댓글: `blog/feed`만 지원, `diary`는 미지원
- SEO 최적화 + 최신 기능 활용: SSR/ISR 사용 전제

---

## 2) 기술 스택/결정사항(고정)

- 프론트: Next.js (TypeScript, App Router)
- 스타일: Tailwind CSS
- 인증: Supabase Auth (Email/Password)
- 배포(프론트): **AWS Amplify Hosting** (SSR/ISR 지원)
- 백엔드: AWS Lambda (Node.js + TypeScript) + API Gateway
- DB: DynamoDB (단일 테이블, Query 기반)
- 이미지: S3 업로드 + (선택) CloudFront 서빙
  - 공개 이미지: 캐시 가능
  - 비공개 이미지: 서명 URL/서버 발급 방식으로 접근 제어

> 참고: 현재 구현은 개발 속도를 위해 **로컬 목업 API(`app/api/*`) + 로컬 저장소(`.data/`, `public/uploads/`)**를 사용합니다.  
> AWS(Lambda/DynamoDB/S3)로 교체하는 작업은 `tasklist.md` PHASE를 따라 진행합니다.

---

## 3) 작업 규칙 (필수)

### 3.1 커밋 규칙

- 작업은 **기능 단위(슬라이스)**로 완료할 때마다 커밋합니다.
- 커밋 전 반드시:
  - `npm run lint` 통과
  - `npm run build` 통과
- 커밋 메시지 형식:
  - Conventional Commit 스타일 사용: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:` 등
  - **제목/본문 모두 한글로 작성**
  - 본문에는 변경점 요약을 불릿으로 정리
- 사용자 요청 없이 `git commit --amend`, `rebase`, `reset` 같은 히스토리 수정은 하지 않습니다.

### 3.2 tasklist 업데이트 규칙

- 기능이 “에러 없이 잘 완성”되면(= lint/build 통과 기준) 즉시 `tasklist.md`에서 해당 항목을 `[x]`로 체크합니다.
- 체크는 실제로 완료된 범위만 표시합니다(예: UI만 있고 API가 없으면 완료로 처리하지 않음).
- 커밋에는 **기능 변경 + tasklist 체크 갱신**이 함께 들어가는 것을 권장합니다.

### 3.3 품질/보안 기본 원칙

- `private` 글/이미지/데이터는 인증 없이 노출되지 않게 합니다(목록/상세/댓글/다운로드 포함).
- `diary`는 댓글 미지원(조회/작성 모두 불가).
- 타입 라우팅은 엄격하게 처리합니다(예: `/blog/[slug]`에서 feed 글이면 404).
- 불필요한 스코프 확장은 피하고, 요청된 범위 중심으로 진행합니다.

---

## 4) Definition of Done (기능 단위 완료 기준)

기능 슬라이스가 “완료”로 간주되려면 아래를 모두 만족해야 합니다.

- 관련 기능이 동작(로컬 기준)하고, 권한/타입 규칙 위반이 없음
- `npm run lint` + `npm run build` 통과
- `tasklist.md` 해당 항목 `[x]` 체크 반영
- 한국어 Conventional Commit 메시지로 커밋 완료

---

## 5) 실행/환경변수

- 로컬 실행: `npm i && npm run dev`
- Supabase 연동을 위해 `.env.local`을 만들고 `/.env.example`을 참고해 값 설정
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ADMIN_EMAILS`
- `NEXT_PUBLIC_API_BASE_URL`은 선택(미설정 시 같은 origin의 `/api` 사용)

---

## 6) 소스 오브 트루스

- 전체 진행 단계/우선순위: `tasklist.md`
- 문서/온보딩: `README.md`
