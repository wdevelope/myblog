# Supabase 데이터 페칭 기술 (Data Fetching Skill)

이 기술은 Supabase(Postgres & Storage)를 통해 데이터를 조회하고 관리하는 아키텍처 가이드와 구현 패턴을 정의합니다.

## 1. 클라이언트 선택 가이드

프로젝트 상황에 따라 세 가지 유형의 Supabase 클라이언트를 전략적으로 선택합니다.

| 유형 | 경로 | 사용 시점 | 특징 |
| :--- | :--- | :--- | :--- |
| **Server Client** | `@/lib/supabase/server` | 서버 컴포넌트(SC), API Route | 사용자의 쿠키/세션 기반 권한 부여 (RLS 적용) |
| **Client Client** | `@/lib/supabase/client` | 클라이언트 컴포넌트(CC) | 브라우저 전용. RLS 적용. 소규모 비동기 작업용 |
| **Service Role** | `@/lib/supabase/service` | 서버 사이드 관리자 작업 | 모든 권한(RLS) 우회. 보안상 **서버 전용**으로만 사용 |

## 2. 데이터 매핑 및 타입 전략

### 2.1 매핑 로직 (Transformer Pattern)
DB Row 구조와 프론트엔드 UI용 타입(`Post` 등)은 다를 수 있습니다. 항상 다음과 같은 매핑 함수를 통해 데이터를 정제합니다.

- 예시: `lib/server/posts.ts`의 `mapPost` 함수
```typescript
export function mapPost(row: PostRow): Post {
  return {
    id: row.id,
    title: row.title,
    // ... 필드명 정제 및 기본값 처리
    commentCount: row.comments?.[0]?.count ?? 0,
  };
}
```

### 2.2 관계 쿼리 및 성능 최적화
- **Count 연동**: 목록 조회 시 댓글 갯수 등을 한 번의 쿼리로 가져오기 위해 `select("*, comments(count)")` 패턴을 적극 활용합니다.
- **N+1 방지**: 목록의 각 항목마다 별도의 쿼리를 날리지 않도록 Supabase의 조인/필터링 기능을 우선 사용합니다.

## 3. Storage 활용 (이미지/파일)

- **Public**: `/storage/v1/object/public/` 경로를 통해 직접 접근 가능한 공개 이미지.
- **Private**: Signed URL을 생성하거나, 서버 사이드 프록시 API(`api/images`)를 통해 접근을 제어해야 합니다.

## 4. 보안 규칙 (RLS)
- 민감한 데이터(`diary` 등)는 반드시 RLS 정책이 활성화되어 있어야 하며, 에이전트는 코드 레벨에서도 권한 검증 로직(`isAdminDb`)을 이중으로 구현해야 합니다.
