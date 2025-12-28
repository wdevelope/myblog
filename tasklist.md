```
기획 → AWS 인프라 → DB 설계 → Lambda API → Frontend → 배포 → 운영
```

---

# ✅ PHASE 0. 사전 결정 (설계 고정)

- [ ] 프론트: **Next.js (TypeScript, App Router)**
- [ ] 백엔드: **Next.js Route Handlers + Supabase**
- [ ] DB: **Supabase Postgres**
- [ ] 기능 스펙 고정
  - [ ] 글 타입: `blog` / `feed` / `diary`
  - [ ] 공개 범위(모든 글 공통): `public` / `private` (선택 가능)
  - [ ] 이미지 첨부(모든 글 공통): O
  - [ ] 댓글: `blog/feed`만 O, `diary`는 X
  - [ ] 카테고리: `blog`에만 필수(권장), `feed/diary`는 선택
- [ ] 배포:

  - Front → **AWS Amplify Hosting(Next.js SSR/ISR 지원)** ✅ (선택 확정)
  - API → Next.js + Supabase

---

# 🟦 PHASE 1. Supabase 기본 세팅

### 프로젝트 생성 / 환경변수

- [x] Supabase 프로젝트 생성
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 설정(서버 전용)
- [ ] `ADMIN_EMAILS` 설정(관리자 이메일 목록)

### Auth 설정

- [ ] Supabase Auth 활성화(Email/Password)
- [ ] (선택) 이메일 확인/비밀번호 정책 설정
- [ ] 관리자/일반 사용자 역할 구분 전략 확정(기본: `ADMIN_EMAILS` 기반)

---

# 🟦 PHASE 2. DB(Postgres) 설계 & RLS

### 테이블 설계

- [x] `posts`
- [x] `comments`

#### 데이터 모델 정의

- [x] Post (`blog/feed/diary` 공통)
- [x] Comment (`blog/feed`만, 로그인 사용자만 작성/조회)

#### 조회 패턴(필수) → 키 설계에 반영

- [x] 타입별 최신 글 목록: `blog/feed/diary` 각각 `createdAt desc`
- [x] 카테고리별 최신 글 목록: `blog`에서 `categorySlug + createdAt desc`
- [x] slug로 글 상세 조회: `slug` unique index
- [x] 댓글 목록: `post_id + createdAt asc`
- [x] 비공개 글: **admin만 조회**

### RLS 정책

- [x] Public 글: 무인증 조회 가능(`visibility = public`)
- [x] Private/Diary: admin만 조회/작성 가능
- [x] 댓글: 로그인 사용자만 조회/작성 가능(그리고 diary는 금지)

---

# 🟦 PHASE 3. API/서버 로직(Next.js)

- [x] `/api/posts` 목록/작성(admin)
- [x] `/api/posts/[slug]` 상세(public + private는 admin만)
- [x] `/api/comments` 조회/작성(로그인 사용자만, diary는 불가)

---

# 🟦 PHASE 4. 이미지(Supabase Storage)

- [x] 버킷 생성
  - [x] `post-images-public` (public read)
  - [x] `post-images-private` (admin만 read)
- [ ] 업로드 정책(RLS)
  - [ ] admin만 업로드 가능
- [x] 비공개 이미지 접근
  - [x] `/api/images?bucket=...&path=...` → signed URL 리다이렉트(admin 전용)

---

# 🟦 PHASE 5. Supabase Auth 연동(Next.js)

- [x] `/login` 구현(로그인/회원가입)
- [x] `/logout` 구현
- [x] admin 판별: `ADMIN_EMAILS` 기반
- [x] 보호 섹션: `/diary`, `/admin` (admin only)

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
- [ ] Supabase 기반 API 호출
- [ ] SEO 메타 자동 생성
- [ ] 인증 연동(Supabase Auth)
  - [x] 로그인 UI: `/login`
  - [x] 로그아웃: `/logout`
  - [x] 댓글: 로그인 사용자만 작성/조회
  - [x] Private/Diary/Admin: admin만 접근

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
- [x] `/api/images` (비공개 이미지 signed URL: admin only)

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
