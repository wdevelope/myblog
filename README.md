# myblog

Next.js(App Router) + Tailwind CSS 기반 개인 블로그.

- 글 타입: `blog` / `feed` / `diary`
- 공개 범위: `public` / `private` (글 단위 선택)
- 댓글: `blog/feed`만 지원, `diary`는 미지원
- 이미지 첨부: 모든 글 타입 지원
- 인증: Cognito Hosted UI (OAuth 2.0 + PKCE)

> 현재는 프론트 기능을 빠르게 검증하기 위해 **로컬 목업 API(`app/api/*`) + 파일 저장소(`.data/`, `public/uploads/`)**로 동작합니다.  
> 추후 Lambda/DynamoDB/S3로 교체할 예정입니다.

## Getting Started

### 1) 환경 변수 준비

로컬에서 Cognito 연동을 확인하려면 `.env.local`을 만들고 `/.env.example`을 참고해 값을 채워주세요.

필수:

- `NEXT_PUBLIC_COGNITO_DOMAIN`
- `NEXT_PUBLIC_COGNITO_CLIENT_ID`
- `NEXT_PUBLIC_COGNITO_REDIRECT_URI` (예: `http://localhost:3000/auth/callback`)
- `NEXT_PUBLIC_COGNITO_LOGOUT_REDIRECT_URI` (예: `http://localhost:3000/`)

선택:

- `NEXT_PUBLIC_API_BASE_URL` (미설정 시 자동으로 같은 origin의 `/api`를 사용)

### 2) 실행

```bash
npm i
npm run dev
```

브라우저에서 `http://localhost:3000` 접속.

## 주요 라우트

- 공개 섹션: `/`, `/blog`, `/feed`
- 보호 섹션(로그인 필요): `/diary`, `/admin`
- 인증: `/auth/login`, `/auth/callback`, `/auth/logout`

## 로컬 목업 API

- `GET /api/posts?type=blog|feed|diary`
- `POST /api/posts` (로그인 필요)
- `GET /api/posts/[slug]`
- `GET /api/comments?postId=...`
- `POST /api/comments` (`diary`는 불가)
- `POST /api/uploads` → 업로드 URL 발급(로그인 필요)
- `PUT /api/uploads/put?key=...` → 파일 업로드(로그인 필요)
- `GET /api/uploads/get?key=...` → 비공개 파일 다운로드(로그인 필요)

## 빌드/검증

```bash
npm run lint
npm run build
```

> 참고: 현재 실행 환경에서 Turbopack이 제한(os error 1)될 수 있어 `build`는 `webpack`으로 고정되어 있습니다.

## 배포(AWS Amplify)

- Amplify Hosting에 Git 리포지토리 연결
- Amplify 환경변수에 `.env.example` 항목 설정
- Cognito App Client의 Callback/Logout URL을 Amplify 도메인 기준으로 등록
