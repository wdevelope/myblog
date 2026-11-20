---
paths:
  - "lib/actions/**"
  - "lib/server/**"
  - "lib/supabase/**"
  - "app/api/**"
  - "supabase/**"
  - "proxy.ts"
  - "next.config.ts"
  - "vercel.json"
---
# 서버·DB 규칙 (CLAUDE.md 구조)

## 쓰기와 조회
- 쓰기: `lib/actions/*.ts` 서버 액션. 입력은 zod로 검증한다. 반환은 `{ success: true, … } | { success: false, error }`이고, DB·Storage 오류는 원문을 돌려주지 않고 `dbFailure`(`lib/server/dbFailure.ts`)로 서버 로그에 남긴다.
- 캐시 무효화: 성공하면 `revalidatePublicPosts`로 공개 캐시(태그·경로)를 무효화한다. 댓글 쓰기·삭제도 그 글의 상세를 무효화한다. 태그는 `updateTag`로 바로 만료하므로 서버 액션에서만 부른다(`revalidateTag(tag, profile)`는 쓴 직후 첫 방문자에게 이전 내용을 준다). 목록 페이지가 route group 안에 있어 `revalidatePath`는 `type` 없이 주소로 부른다.
- 관리자 조회: `lib/server/posts.ts`가 쿠키 세션 서버 클라이언트(RLS 적용)로 읽는다. 아티클 목록의 카테고리만 `ArticleIndex`가 같은 클라이언트로 직접 읽는다.
- 카테고리: 이름 변경은 외래 키 `on update cascade`로 한 문장이고, 삭제·순서 변경은 DB 함수 `delete_category`·`move_category`(service role만 호출)다. 새로 만들 때는 `ensureCategory`(`lib/server/categories.ts`)가 이름 규칙을 본다.
- 쓰기 횟수 제한: 댓글(1분 5개·1시간 30개)·방명록(10분 3개·하루 10개)은 `before insert` 트리거(`check_comment_rate`·`check_guestbook_rate`, 관리자 제외)가 `PT429`로 막는다. PostgREST 직접 insert도 같은 길이라 서버 액션이 아니라 DB에 둔다. 액션은 `RATE_LIMITED_CODE`를 `RATE_LIMITED` 문구로 바꾼다. `/api/views`는 코드가 아니라 Vercel 방화벽 규칙으로 막는다(로드맵 28절).
- 댓글 메일 알림: `createComment`가 관리자 외 댓글·답글을 저장·무효화한 뒤 `after()`로 `lib/server/notify.ts`를 부른다. Resend HTTP API에 text 본문만 보내고(사용자 입력을 HTML에 넣지 않는다), `RESEND_API_KEY`·`COMMENT_NOTIFY_EMAIL`이 없으면 건너뛰며, 발송 실패는 댓글 쓰기를 실패로 돌리지 않는다. 새 방명록도 같은 모듈로 알리되 비밀글 내용은 메일에 싣지 않는다.

## 이미지
- `app/api/images` 라우트 핸들러가 service role로 Storage에 올리고 내려준다. 키 형식은 `<버킷>:<경로>`. 비공개 버킷 응답은 `Cache-Control: private, no-store`이고, SVG는 올리지 않는다.
- 버킷은 올리는 순간의 공개 범위로 정해지므로, 글을 저장할 때 `savePost`가 글 공개 범위와 다른 버킷의 파일(본문·첨부·썸네일)을 같은 경로로 옮기고 키를 바꾼다(피드는 공개).
- 글을 지우거나 수정해 뺀 이미지는 저장·삭제 뒤 `removeUnusedImages`가 지운다. 다른 글이 같은 키를 쓰면 남기고, 실패해도 글 작업은 성공이며 서버 로그에만 남는다. 저장하지 않고 버린 업로드는 남는다.
- `next/image` 변환기는 쿼리 없는 로컬 주소와 내 프로젝트의 공개 저장소 주소만 받는다(`next.config.ts`). 변환기는 쿠키를 보내지 않으므로 `/api/images` 주소는 `unoptimized`로 뺀다(`isImageProxySrc`).

## Supabase
- DB 타입: `lib/supabase/database.types.ts`는 생성 파일이라 고치지 않는다. 구조를 바꾸면 MCP `generate_typescript_types`(개발 프로젝트)로 통째로 다시 만든다. 클라이언트는 `type`·`visibility`를 좁힌 `lib/supabase/database.ts`의 `Database`를 쓴다. 생성 타입은 외래 키만 보므로 RLS가 가린 임베드가 null로 오는 경우를 나타내지 못한다.
- 클라이언트: `lib/supabase/server.ts`(서버, RLS 적용), `client.ts`(브라우저), `service.ts`(서버 전용, RLS 우회 — `assertAdmin` 뒤에만). `service.ts` 예외 넷: 방문자 다이어리 목록의 본문 없는 조회, 회원 탈퇴 `deleteAccount`의 본인 계정 삭제, `/api/views`의 `increment_post_view` 호출(anon 조회로 공개 아티클임을 확인한 뒤), `/api/images` GET의 공개 버킷 파일 내려주기.
- 개발 서버는 `next.config.ts`가 `lib/supabase/devGuard.ts`로 운영 주소를 막는다(빌드·`next start`는 판정하지 않는다).
- 일시정지 방지: `/api/cron/keep-alive`(Vercel Cron 하루 1회, `CRON_SECRET`)가 캐시하지 않는 조회로 DB 활동을 남긴다(무료 플랜 7일 무활동 일시정지).

## 인증
- Supabase Auth(이메일·비밀번호). 관문은 `lib/server/admin.ts`다. 화면 분기는 `getViewer()`(user·isAdmin), 페이지 접근은 `requireLogin`·`requireAdmin`(redirect), 서버 액션·라우트 핸들러는 `assertAdmin()`(실패를 돌려줌).
- 관리자는 `app_metadata.is_admin`(JSON `true`)만 보고, RLS의 `is_admin()`도 JWT의 같은 값을 본다. 관리자 지정은 SQL Editor(service role)로 `auth.users.raw_app_meta_data`에 `is_admin: true`를 넣고 다시 로그인한다(RLS는 토큰이 갱신돼야 반영).
- `proxy.ts`는 `sb-` 쿠키가 있을 때 세션 갱신만 한다. 화면 전환 요청(`rsc` 헤더)에서는 돌지 않고, 그때 토큰은 열린 탭의 브라우저 클라이언트가 갱신한다.
