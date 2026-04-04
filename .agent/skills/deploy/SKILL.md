# Vercel 배포 및 운영 기술 (Deployment Skill)

이 기술은 Vercel 플랫폼에 Next.js 블로그를 배포하고 프로젝트의 환경 변수 및 가시성을 관리하는 프로세스를 정의합니다.

## 1. 개요
이 프로젝트는 Vercel을 기본 배포 저장소로 사용하며, Next.js의 SSR 및 ISR 기능을 활용합니다. 모든 `public` 코드는 GitHub을 통해 동기화됩니다.

## 2. 환경 변수 구성

배포 시 반드시 아래의 변수들이 Vercel 대시보드에 설정되어야 합니다.

| 변수명 | 용도 | 설명 |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | Supabase 프로젝트 API 엔드포인트 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 클라이언트 키 | 클라이언트 사이드 데이터 조회용 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 키 | 권한 우회 및 관리자용 데이터 조회 키 (보안 주의) |

## 3. 배포 프로세스

### 3.1 로컬 검증 (Pre-deployment)
에이전트는 코드 푸시 전 반드시 로컬에서 다음 명령을 실행하여 빌드 성공 여부를 확인합니다.
```bash
npm run build
```

### 3.2 Vercel 프리뷰 (Preview)
- PR 생성 시 자동으로 생성되는 Vercel Preview URL을 통해 실제 배포 환경에서의 동작을 검증합니다.
- 특히 `SSR/ISR`이 필요한 페이지(`/article/[slug]` 등)가 정상적으로 렌더링되는지 확인합니다.

## 4. 모니터링 및 최적화
- **Edge Runtime**: 가벼운 API 핸들러나 미들웨어에서 Edge Runtime 활용 여부를 검토합니다.
- **Cache**: `revalidatePath` 또는 `revalidateTag`를 적절히 사용하여 컨텐츠 업데이트 주기를 관리합니다.

> [!CAUTION]
> `SUPABASE_SERVICE_ROLE_KEY`는 절대 클라이언트 사이드 코드(`"use client"`)에 노출되어서는 안 됩니다. 항상 서버 사이드 핸들러(`api/*` 등) 또는 서버 액션에서만 사용해야 합니다.
