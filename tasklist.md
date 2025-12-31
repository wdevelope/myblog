```
기획 → DB 설계 → API/Frontend → 배포 → 운영
```

---

# ✅ PHASE 0. 사전 결정 (설계 고정)

- [x] 프론트: **Next.js (TypeScript, App Router)**
- [x] 백엔드: **Next.js Route Handlers + Supabase**
- [x] DB: **Supabase Postgres**
- [x] 기능 스펙 고정
  - [x] 글 타입: `blog` / `feed` / `diary`
  - [x] 공개 범위(모든 글 공통): `public` / `private`
  - [x] 이미지 첨부(모든 글 공통): O
  - [x] 댓글: `blog/feed`만 O, `diary`는 X
  - [x] 카테고리: `blog`에만 필수(권장), `feed/diary`는 선택
- [ ] 배포 계획:

  - Front/API → **Vercel**
  - DB/Auth/Storage → **Supabase**

---

# 🟦 PHASE 1. Supabase 기본 세팅

### 프로젝트 생성 / 환경변수

- [x] Supabase 프로젝트 생성
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 설정(서버 전용)
- [ ] `public.users.is_admin`에 관리자 지정(최초 admin 부트스트랩)

### Auth 설정

- [ ] Supabase Auth 활성화(Email/Password)
- [ ] (선택) 이메일 확인/비밀번호 정책 설정
- [x] 관리자/일반 사용자 역할 구분 전략 확정
  - [x] 기본: `public.users.is_admin=true`인 사용자를 admin으로 판별
  - [x] 이후 권한 체크: DB RLS는 `public.users.is_admin` 기준

---

# 🟦 PHASE 2. DB(Postgres) 설계 & RLS

### 테이블 설계

- [x] `posts`
- [x] `comments`
- [x] `users` (프로필/권한: `is_admin`)

#### 데이터 모델 정의

- [x] Post (`blog/feed/diary` 공통)
- [x] Comment (`blog/feed`만, 로그인 사용자만 작성/조회)
- [x] User (`auth.users`와 1:1, `public.users.is_admin`로 역할 관리)

#### 조회 패턴(필수) → 키 설계에 반영

- [x] 타입별 최신 글 목록: `blog/feed/diary` 각각 `createdAt desc`
- [x] 카테고리별 최신 글 목록: `blog`에서 `categorySlug + createdAt desc`
- [x] slug로 글 상세 조회: `slug` unique index
- [x] 댓글 목록: `post_id + createdAt asc`
- [x] 비공개 글: **admin만 조회**

### RLS 정책

- [x] `public.is_admin()` 함수로 admin 판별( `public.users.is_admin` 기반)
- [x] Public 글: 무인증 조회 가능(`visibility = public`, `type != diary`)
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
- [x] 업로드 방식 확정/구현
  - [x] `/api/images`(server)에서 service role로 업로드(admin only)
  - [ ] (선택) Storage RLS로 direct upload 차단/허용 정책 정교화
- [x] 비공개 이미지 접근
  - [x] `/api/images?bucket=...&path=...` → signed URL 리다이렉트(admin 전용)

---

# 🟦 PHASE 5. Supabase Auth 연동(Next.js)

- [x] `/login` 구현(로그인/회원가입)
- [x] `/logout` 구현
- [x] admin 판별
  - [x] DB 레벨(RLS): `public.users.is_admin` 기반
- [x] 보호 섹션: `/diary`, `/article/write`, `/feed/write`, `/diary/write` (admin only)

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
- [x] `/diary` (다이어리 목록: 로그인 필요)
- [x] `/diary/[slug]` (다이어리 상세: 로그인 필요)
- [x] `/admin` (관리자)

### 데이터 패칭

- [x] Supabase 기반 API 호출
- [x] 공개 목록 캐시(태그 + `revalidate=60`) 적용
- [ ] SEO 메타 자동 생성
- [ ] 인증 연동(Supabase Auth)
  - [x] 로그인 UI: `/login`
  - [x] 로그아웃: `/logout`
  - [x] 댓글: 로그인 사용자만 작성/조회
  - [x] Private/Diary/Admin: admin만 접근

---

# 🟦 PHASE 7. 관리자 기능 (최소)

- [x] 관리자 인증 (Supabase Auth + `public.users.is_admin`)
- [x] 글 작성 폼
- [x] Markdown 입력
- [x] 미리보기
- [x] 공개범위 선택(`public/private`)
- [x] 타입 선택(`blog/feed/diary`)
- [x] 카테고리 선택/생성(`blog`용)
- [x] 카테고리 관리(생성/수정/삭제 모달)
- [x] 이미지 첨부(`/api/images` 서버 업로드)
- [ ] 댓글 관리(삭제/차단 등 최소 기능)

# 🟦 PHASE 8. 배포 (Vercel)

- [ ] Vercel 프로젝트 생성
- [ ] Git 리포지토리 연결 (자동 배포)
- [ ] 환경변수 설정 (`.env.example` 기준)
- [ ] Preview/Prod 브랜치 전략(선택)
- [ ] (선택) Vercel 도메인 연결

---

# 🟦 PHASE 9. 도메인 & HTTPS

- [ ] 도메인 구매
- [ ] DNS 연결(Vercel 권장 가이드)
- [ ] HTTPS 확인

---

# 🟦 PHASE 10. 운영 & 최적화

### 비용 관리

- [ ] Supabase 사용량 모니터링(쿼터/스토리지)
- [ ] Vercel 사용량 모니터링(빌드/대역폭)

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
