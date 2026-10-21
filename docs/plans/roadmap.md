# 로드맵

- **상태:** 진행 중
- **작성:** 2026-10-21
- **근거:** 운영 재개를 위한 하네스 기본 세팅과 그 과정의 발견 사항, 사용자 결정(2026-10-21: DB를 Supabase에서 MongoDB로 전환)

이전 `tasklist.md`(항목 모두 완료)를 대체한다. 진행 상태의 정본은 이 문서의 "진행 현황"이고, `roadmap` 스킬과 세션 시작 훅이 첫 미완료 단계를 읽는다.

## 진행 현황

- [x] 0. 하네스 기본 세팅
- [ ] 1. Supabase 프로젝트 상태 확인과 데이터 백업 (사용자 작업)
- [ ] 2. 관리자 판정 보안 수정
- [ ] 3. MongoDB 전환
- [ ] 4. 현행 명세 테스트 부채·§7 정리

## 0. 하네스 기본 세팅

> **결과** (2026-10-21): CLAUDE.md, 불변식, 현행 명세 9개(시나리오 106개), 편집 가드·TDD 훅·세션 맥락 훅, 커밋 가드·git 훅·명세 검사, Vitest 설정과 첫 단위 테스트(POST-4·5, IMG-1~3), CI를 세웠다. `AGENTS.md`는 CLAUDE.md를 가리키게 줄였고 `.agent/`(Antigravity용)와 `tasklist.md`는 지웠다.

## 1. Supabase 프로젝트 상태 확인과 데이터 백업

- 명세 불필요(코드 변경 없음, 사용자가 대시보드에서 한다).
- 현황: 2026-10-21 `mgyoglaujbxfbuxxlcfj.supabase.co`의 DNS가 NXDOMAIN이다. `npm run build`가 sitemap 프리렌더에서 실패하고, 운영 사이트도 DB에 닿지 못하는 상태로 보인다.
- 할 일
  1. Supabase 대시보드에서 프로젝트 상태를 확인한다. 일시정지(paused)면 Restore한다.
  2. 복구되면 `pg_dump`로 스키마와 데이터를 통째로 백업한다. 기본 스키마(테이블·`is_admin()`·기본 RLS·Storage 정책)가 저장소 마이그레이션에 없어서 덤프가 유일한 원본이다.
  3. Storage 버킷(`post-images-public`·`post-images-private`)의 파일도 내려받는다.
- 복구할 수 없으면(삭제됨) 기존 데이터 없이 3단계를 진행한다.
- 주의: 복구하면 2단계 결함이 열린 채 운영된다. 복구 직후 2단계를 하거나, 백업만 하고 다시 일시정지한다.

## 2. 관리자 판정 보안 수정

- 대상: [auth 명세](../specs/auth.md) §7의 1(요청 헤더 위조로 관리자 우회), 2(`user_metadata.is_admin` 신뢰 — 누구나 가입 후 관리자), 3(사용자 id·email 응답 헤더 노출), 4(로그인·콜백의 열린 리다이렉트).
- 영향: 글·카테고리 쓰기와 삭제(service role이라 RLS가 막지 못함), 비공개 이미지 조회·업로드, 관리자 화면, 댓글의 관리자 분기. 카테고리는 비로그인 요청으로도 생성·이름 변경·삭제·공개 전환이 가능하다([categories 명세](../specs/categories.md) §7).
- 방식: spec 스킬로 auth 명세의 AUTH-7·AUTH-8·AUTH-9(와 리다이렉트 시나리오)의 결과를 바꿔 승인받고, implement 스킬로 테스트 먼저 고친다.
- 결정 필요: 3단계에서 Supabase Auth를 유지하는지에 따라 이 단계를 단독으로 할지 3단계에 합칠지 정한다. 1단계에서 Supabase를 다시 켠다면 단독으로 먼저 한다(권고).

## 3. MongoDB 전환

- 결정 필요(착수 전 사용자 질문)
  1. 범위: DB만 / DB + 인증 / DB + 인증 + 이미지 저장소. 지금은 Supabase가 Postgres·Auth·Storage를 모두 맡는다.
  2. 호스팅: MongoDB Atlas 등, Vercel과의 연결 방식.
  3. 데이터 이전: 1단계 백업에서 옮길지, 새로 시작할지.
  4. 접근 계층: 공식 `mongodb` 드라이버 / Mongoose.
  5. 권한: MongoDB에는 RLS가 없다. 지금 RLS가 1차 방어인 규칙(비공개 글·카테고리·댓글)을 모두 서버 코드로 옮기고 불변식 1·2의 강제 요구를 갱신한다.
  6. 공개 캐시: PostgREST `fetch` 태그 캐시를 대신할 방법(`unstable_cache`·`"use cache"` + 태그 등).
  7. 테스트: 통합 테스트는 `mongodb-memory-server`, 테스트 DB 이름에 `test`.
- 진행: 전환 명세 초안 → 승인 → 슬라이스별 구현(posts → comments → categories → images·auth). 각 현행 명세는 해당 슬라이스에서 시나리오를 고쳐 승인받는다. `supabase/` 마이그레이션과 `lib/supabase/`는 마지막 슬라이스에서 지운다(덧방 금지).
- 이어서 할 일: 결정 필요 1~7을 묻는다.

## 4. 현행 명세 테스트 부채·§7 정리

- 테스트 부채: 시나리오 106개 중 101개에 테스트가 없다(`npm run spec:check`). 전환 대상 코드는 전환 슬라이스에서 테스트를 쓰므로, 전환 뒤에도 남는 화면·순수 로직부터 줄인다.
- 각 명세 §7 중 전환 뒤에도 남는 것을 골라 개별 명세 변경으로 진행한다. 후보:
  - ISR 무력화: 목록·상세가 `getCurrentUser`(`headers()`) 때문에 매 요청 동적 렌더링된다(article·feed·diary §7).
  - 다이어리 상세가 없는 글·다른 타입 글에도 404 대신 "비공개 다이어리"를 200으로 보인다(diary §7).
  - 수정 화면에서 없는 slug가 404 대신 500이 된다(article·feed·diary §7).
  - 본문 편집기 이미지가 글 공개 범위와 상관없이 공개 버킷에 올라간다(images §7).
  - 본문 HTML 정화 없음(posts §7).
  - 상세 페이지 `generateMetadata` 없음(article §7).
  - 피드 댓글 화면이 없고 카드의 좋아요·댓글 숫자는 하드코딩이다(feed §7).
  - 조회수를 올리는 코드가 없다(posts §7).

## 발견 사항 (범위 밖)

| 항목 | 위치 | 비고 |
|---|---|---|
| Next 16 `middleware` 파일 이름 폐기 예정(빌드 경고, `proxy`로 변경) | `middleware.ts` | 3단계 인증 슬라이스에서 함께 처리 |
| 기본 스키마·Storage 정책이 마이그레이션에 없음 | `supabase/migrations/` | 1단계 덤프로 보존, MongoDB 전환 뒤 폐기 |
| 검색 입력란이 동작하지 않음 | 헤더·모바일 메뉴 | site §7 |
| `BackButton`이 뒤로 가지 않고 항상 `fallbackHref`로 이동 | `app/_components/BackButton.tsx` | site §7 |
