# 프로젝트 작업 목록 (tasklist.md)

## 1. 성능 및 최적화
- [x] Supabase DB 인덱스 추가 (Post/Category/Type/Visibility 등)
- [x] `getPublicPostCounts` 쿼리 최적화 (PostgREST nested count)
- [x] 페이지 및 API 응답 속도 개선 확인

## 2. 댓글 기능
- [x] 댓글 삭제 서버 액션 구현 (`deleteComment`)
- [x] 댓글 삭제 권한(RLS) 정책 추가
- [x] 댓글 스레드 UI 삭제 버튼 추가 및 연동

## 3. UI/UX 개선
- [x] 홈 페이지 아티클 리스트에서 "읽기 →" 버튼 제거
- [x] PostEditor(아티클/다이어리 쓰기) 상단 헤더 모바일 패딩 조정
- [x] CKEditor 툴바 모바일 줄바꿈(`flex-wrap`) 지원
- [x] CKEditor 제목 입력란 반응형 폰트 크기 적용

## 4. 기타
- [x] 전체 린트 및 빌드 검증 (`npm run lint`, `npm run build`)
