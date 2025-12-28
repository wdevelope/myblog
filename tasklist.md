```
기획 → AWS 인프라 → DB 설계 → Lambda API → Frontend → 배포 → 운영
```

---

# ✅ PHASE 0. 사전 결정 (설계 고정)

- [ ] 프론트: **Next.js (TypeScript, App Router)**
- [ ] 백엔드: **AWS Lambda (Node.js + TypeScript)**
- [ ] DB: **DynamoDB (On-Demand)**
- [ ] 기능 스펙 고정
  - [ ] 글 타입: `blog` / `feed` / `diary`
  - [ ] 공개 범위(모든 글 공통): `public` / `private` (선택 가능)
  - [ ] 이미지 첨부(모든 글 공통): O
  - [ ] 댓글: `blog/feed`만 O, `diary`는 X
  - [ ] 카테고리: `blog`에만 필수(권장), `feed/diary`는 선택
- [ ] 배포:

  - Front → **AWS Amplify Hosting(Next.js SSR/ISR 지원)** ✅ (선택 확정)
  - API → API Gateway + Lambda

---

# 🟦 PHASE 1. AWS 기본 세팅

### 계정 / 보안

- [ ] AWS 계정 생성
- [ ] MFA 활성화
- [ ] IAM 사용자 생성 (Admin or PowerUser)
- [ ] AWS CLI 설치 & 로그인

### 기본 리전 결정

- [ ] 리전 선택 (예: ap-northeast-2)

### Cognito(User Pool) 인증 세팅 ✅ (선택 확정)

- [ ] Cognito User Pool 생성
  - [ ] 로그인 방식: Email(권장) 또는 Username
  - [ ] 셀프 회원가입: 필요 없으면 OFF(나만/소수 운영 시 권장)
  - [ ] MFA: 초기엔 OFF(비용/복잡도↓), 필요 시 TOTP로 확장(SMS는 비용 증가 가능)
- [ ] App Client 생성
  - [ ] (권장) OAuth 2.0 + PKCE 활성화
  - [ ] Callback/Logout URL: Amplify 도메인 기준으로 등록
- [ ] (권장) 그룹 생성: `admin` (관리자 권한)
- [ ] 초기 사용자 생성(관리자) + `admin` 그룹 할당
- [ ] (선택) 커스텀 도메인 연결(Cognito Hosted UI 쓸 경우)

---

# 🟦 PHASE 2. DynamoDB 설계 & 생성

### 테이블 설계 (블로그용 단일 테이블 추천)

- [ ] 테이블명: `BlogTable`
- [ ] Partition Key (PK)
- [ ] Sort Key (SK)

#### 데이터 모델 정의

- [ ] Post (`blog/feed/diary` 공통)
- [ ] Comment (`blog/feed`만)
- [ ] Category (`blog`용)
- [ ] Slug 인덱스(슬러그로 글 찾기)

```ts
PK = "POST#<postId>";
SK = "META";

PK = "POST#<postId>";
SK = "COMMENT#<commentId>";
```

#### 조회 패턴(필수) → 키 설계에 반영

- [ ] 타입별 최신 글 목록: `blog/feed/diary` 각각 `createdAt desc`
- [ ] 카테고리별 최신 글 목록: `blog`에서 `categorySlug + createdAt desc`
- [ ] slug로 글 상세 조회: `slug -> postId` 빠르게
- [ ] 댓글 목록: `postId + createdAt asc/desc` (blog/feed만)
- [ ] 비공개 글 접근 제어: `public`은 무인증 조회, `private`은 인증 필요

#### GSI(예시)

- [ ] `GSI1`: 타입/공개범위별 최신 목록
  - `GSI1PK = "TYPE#<blog|feed|diary>#VIS#<public|private>"`
  - `GSI1SK = "CREATED#<ISO>#POST#<postId>"`
- [ ] `GSI2`: 카테고리/공개범위별 최신 목록
  - `GSI2PK = "CAT#<categorySlug>#VIS#<public|private>"`
  - `GSI2SK = "CREATED#<ISO>#POST#<postId>"`
- [ ] (선택) `GSI3`: slug -> postId
  - `GSI3PK = "SLUG#<slug>"`, `GSI3SK = "POST#<postId>"`

### DynamoDB 생성

- [ ] On-Demand 모드 선택
- [ ] TTL 설정 (선택)
- [ ] Free Tier 확인

---

# 🟦 PHASE 3. Lambda 프로젝트 세팅 (TypeScript)

### 프로젝트 초기화

- [ ] Node.js 18+ 사용
- [ ] `npm init`
- [ ] TypeScript 설정
- [ ] esbuild / tsup 세팅

### 폴더 구조

```
lambda/
 ├─ src/
 │   ├─ handlers/
 │   │   ├─ getPosts.ts
 │   │   ├─ getPost.ts
 │   │   └─ createPost.ts
 │   ├─ lib/
 │   │   └─ dynamo.ts
 │   └─ types/
 │       └─ post.ts
```

---

# 🟦 PHASE 4. Lambda API 구현

### 기본 API

- [ ] GET /posts (글 목록)
- [ ] GET /posts/{slug} (글 상세)
- [ ] POST /posts (관리자 글 작성)
- [ ] POST /comments (선택)
- [ ] 이미지 업로드
  - [ ] POST /uploads (프리사인드 URL 발급)
  - [ ] (선택) GET /uploads/{key} (비공개 이미지용 서명 URL 발급)

### 인증/인가

- [ ] 인증 방식 결정: (권장) Cognito(JWT) / (최소) 단일 관리자 API Key
- [ ] 공개 글: 무인증 조회 가능
- [ ] 비공개 글: 인증된 사용자만 조회 가능
- [ ] 글 작성/수정/삭제, 이미지 업로드, 댓글 삭제: 인증 필수

### DynamoDB 연동

- [ ] AWS SDK v3 사용
- [ ] Query 기반 조회만 사용
- [ ] Scan ❌

---

# 🟦 PHASE 5. API Gateway 연결

- [ ] HTTP API 생성
- [ ] Lambda 함수 연결
- [ ] CORS 설정
- [ ] JWT Authorizer 설정(Cognito User Pool)
  - [ ] 공개 엔드포인트: Authorizer 없음
  - [ ] 비공개 엔드포인트: Authorizer 적용
- [ ] Stage 배포
- [ ] API URL 확보

---

# 🟦 PHASE 6. Next.js 프론트엔드

### 프로젝트 생성

- [x] `npx create-next-app`
- [x] TypeScript 활성화
- [x] App Router 사용

### 페이지 구성

- [x] `/` (홈)
- [x] `/blog` (글 목록)
- [x] `/blog/[slug]` (글 상세)
- [x] `/blog/category/[slug]` (카테고리별 목록)
- [x] `/feed` (피드 목록)
- [x] `/feed/[slug]` (피드 상세, 필요 시)
- [x] `/diary` (일기 목록: 로그인 필요)
- [x] `/diary/[slug]` (일기 상세: 로그인 필요)
- [x] `/admin` (관리자)

### 데이터 패칭

- [ ] SSG / ISR 사용
- [ ] Lambda API 호출
- [ ] SEO 메타 자동 생성
- [ ] 인증 연동(Cognito)
  - [ ] 로그인 UI: **Cognito Hosted UI(OAuth 2.0 + PKCE)** ✅ (선택 확정)
  - [x] Callback/Logout 라우트 준비 (예: `/auth/callback`, `/auth/logout`)
  - [x] 로그인 상태에서만 접근 가능한 섹션: `/diary`, `/admin`

---

# 🟦 PHASE 7. 관리자 기능 (최소)

- [x] 관리자 인증 (API Key or Cognito)
- [x] 글 작성 폼
- [x] Markdown 입력
- [x] 미리보기
- [x] 공개범위 선택(`public/private`)
- [x] 타입 선택(`blog/feed/diary`)
- [x] 카테고리 선택/생성(`blog`용)
- [x] 이미지 첨부(프리사인드 업로드)
- [ ] 댓글 관리(삭제/차단 등 최소 기능)

---

# 🟦 PHASE 6.5. 로컬 개발용 API (목업) ✅

> AWS(Lambda/DynamoDB) 붙이기 전에, 프론트 기능을 빠르게 검증하기 위한 로컬 API입니다.

- [x] `/api/posts` (목록/작성)
- [x] `/api/posts/[slug]` (상세)
- [x] `/api/comments` (조회/작성: blog/feed만)
- [x] `/api/uploads` (업로드 URL 발급)
- [x] `/api/uploads/put` (파일 업로드)
- [x] `/api/uploads/get` (비공개 파일 다운로드: 로그인 필요)

# 🟦 PHASE 8. 프론트 배포 (AWS Amplify Hosting)

- [ ] Amplify Hosting 앱 생성
- [ ] Git 리포지토리 연결 (자동 배포 파이프라인)
- [ ] Next.js SSR/ISR 설정 확인 (Amplify Next.js 지원 템플릿/빌드 설정)
- [ ] 환경변수 설정 (예: `NEXT_PUBLIC_API_BASE_URL`, 인증 관련 값 등)
- [ ] Preview/Prod 브랜치 전략(선택)
- [ ] (이미지) S3 버킷 생성(업로드용) + (선택) CloudFront로 서빙
  - [ ] 공개 이미지: CloudFront 캐시로 최적화
  - [ ] 비공개 이미지: S3 private + 서명 URL(서버에서 발급)로 접근 제어

---

# 🟦 PHASE 9. 도메인 & HTTPS

- [ ] 도메인 구매
- [ ] Route53 연결
- [ ] CloudFront에 도메인 연결
- [ ] HTTPS 확인

---

# 🟦 PHASE 10. 운영 & 최적화

### 비용 관리

- [ ] DynamoDB Free Tier 확인
- [ ] Lambda 호출 수 모니터링
- [ ] CloudWatch 로그 확인

### 성능

- [ ] 캐싱 전략
- [ ] 이미지 최적화
- [ ] API 응답 최소화

---

# 🎯 최종 체크리스트 (완성 기준)

- [ ] 글 CRUD 정상
- [ ] SEO 검색 노출
- [ ] HTTPS 적용
- [ ] 월 비용 $0~1 확인
- [x] README 작성 (포트폴리오용)
