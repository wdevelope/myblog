좋아요 👍
그럼 **“Next.js(프론트) + AWS Lambda(Node.js/TypeScript) + DynamoDB”** 조합 기준으로
👉 **실제로 따라 하면 완성되는 Task List**를 단계별로 만들어줄게요.

---

# 🧭 전체 로드맵 한눈에 보기

![Image](https://serverlessland.com/assets/images/repos/nextjs-serverless-architecture.png)

![Image](https://d2908q01vomqb2.cloudfront.net/887309d048beef83ad3eabf2a79a64a389ab1c9f/2020/01/22/Golang-6.jpg)

![Image](https://d1tcczg8b21j1t.cloudfront.net/strapi-assets/s3_diagram_cloudfront_acm_route53_c2a411d6a4.png)

```
기획 → AWS 인프라 → DB 설계 → Lambda API → Frontend → 배포 → 운영
```

---

# ✅ PHASE 0. 사전 결정 (설계 고정)

- [ ] 프론트: **Next.js (TypeScript, App Router)**
- [ ] 백엔드: **AWS Lambda (Node.js + TypeScript)**
- [ ] DB: **DynamoDB (On-Demand)**
- [ ] 배포:

  - Front → S3 + CloudFront
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

---

# 🟦 PHASE 2. DynamoDB 설계 & 생성

### 테이블 설계 (블로그용 단일 테이블 추천)

- [ ] 테이블명: `BlogTable`
- [ ] Partition Key (PK)
- [ ] Sort Key (SK)

#### 데이터 모델 정의

- [ ] Post
- [ ] Comment
- [ ] Tag (선택)

```ts
PK = "POST#<postId>";
SK = "META";

PK = "POST#<postId>";
SK = "COMMENT#<commentId>";
```

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

### DynamoDB 연동

- [ ] AWS SDK v3 사용
- [ ] Query 기반 조회만 사용
- [ ] Scan ❌

---

# 🟦 PHASE 5. API Gateway 연결

- [ ] HTTP API 생성
- [ ] Lambda 함수 연결
- [ ] CORS 설정
- [ ] Stage 배포
- [ ] API URL 확보

---

# 🟦 PHASE 6. Next.js 프론트엔드

### 프로젝트 생성

- [ ] `npx create-next-app`
- [ ] TypeScript 활성화
- [ ] App Router 사용

### 페이지 구성

- [ ] `/` (홈)
- [ ] `/blog` (글 목록)
- [ ] `/blog/[slug]` (글 상세)
- [ ] `/admin` (관리자)

### 데이터 패칭

- [ ] SSG / ISR 사용
- [ ] Lambda API 호출
- [ ] SEO 메타 자동 생성

---

# 🟦 PHASE 7. 관리자 기능 (최소)

- [ ] 관리자 인증 (API Key or Cognito)
- [ ] 글 작성 폼
- [ ] Markdown 입력
- [ ] 미리보기

---

# 🟦 PHASE 8. 프론트 배포 (S3 + CloudFront)

- [ ] Next.js `output: export`
- [ ] S3 버킷 생성
- [ ] 정적 파일 업로드
- [ ] CloudFront 연결
- [ ] HTTPS 자동 적용

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
- [ ] README 작성 (포트폴리오용)

---

## ✅ 한 줄 요약

> **이 Task List 그대로 가면
> “실서비스 가능한 서버리스 개인 블로그” 완성됨**

---

다음 단계로 추천 👇
👉 **PHASE 2: DynamoDB 테이블 설계**부터 같이 상세하게 들어갈까요?
(PK/SK 설계를 아주 깔끔하게 잡아줄게요)
