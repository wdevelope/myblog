# 명세: 이미지 업로드·표시

- **상태:** 현행
- **ID 접두:** IMG
- **근거:** 현행 코드 역작성(2026-10-21)
- **코드 경로:** `app/api/images/`, `lib/image.ts`, `app/_components/PostImages.tsx`
- **승인:** 2026-10-21

## 1. 목적

관리자가 글에 이미지를 올리고, 방문자는 글의 공개 범위에 맞게 이미지를 본다. 공개 이미지는 Supabase Storage 공개 URL로, 비공개 이미지는 관리자 확인을 거치는 서버 프록시로 보낸다.

## 2. 범위

- 포함: `GET·POST /api/images` 라우트 핸들러, 이미지 키 → 화면 주소 변환(`coverSrcFromImageKey`), 첨부 이미지 그리드(`PostImages`).
- 제외: 에디터 안의 업로드 버튼·본문 이미지 업로드 어댑터(posts 명세의 `PostEditor`·`CkEditor`), 관리자 판정(auth).

## 3. 시나리오

### IMG-1. 공개 버킷 키는 Supabase 공개 URL로 바꾼다

- 전제: `NEXT_PUBLIC_SUPABASE_URL`이 있다.
- 행동: `coverSrcFromImageKey("post-images-public:<경로>")`.
- 결과: `<SUPABASE_URL>/storage/v1/object/public/post-images-public/<경로>`다. 경로는 URL 인코딩하되 `/`는 그대로 둔다.
- 테스트 층: 단위

### IMG-2. 공개 버킷이 아닌 키는 서버 프록시 경로로 바꾼다

- 행동: `coverSrcFromImageKey("post-images-private:<경로>")`.
- 결과: `/api/images?bucket=post-images-private&path=<인코딩한 경로>`다. 공개 버킷이어도 `NEXT_PUBLIC_SUPABASE_URL`이 없으면 같은 프록시 경로를 쓴다.
- 테스트 층: 단위

### IMG-3. `버킷:경로` 형식이 아닌 값은 그대로 쓴다

- 행동: `coverSrcFromImageKey("/logo.png")` 또는 `coverSrcFromImageKey("https://example.com/a.png")`처럼 버킷이나 경로가 비는 값.
- 결과: 입력을 그대로 돌려준다. 첫 `:` 뒤가 경로이므로 `https://…`는 버킷 `https`, 경로 `//example.com/a.png`로 읽혀 프록시 경로가 된다(§7).
- 테스트 층: 단위

### IMG-4. bucket이나 path가 없으면 400이다

- 행동: `GET /api/images`에 `bucket` 또는 `path` 쿼리가 없다.
- 결과: 400 `{ "error": "bucket_and_path_required" }`.
- 테스트 층: 단위

### IMG-5. 공개 버킷이 아닌 이미지는 관리자만 받는다

- 행동: `GET /api/images?bucket=post-images-private&path=…`.
- 결과: `requireAdmin`이 비로그인은 `/login?from=%2Fapi%2Fimages`, 비관리자는 `/`로 리다이렉트한다. 관리자는 이미지를 받는다. `post-images-public`은 확인 없이 받는다.
- 테스트 층: 단위

### IMG-6. 이미지를 내려받지 못하면 404, 받으면 원본과 장기 캐시 헤더를 돌려준다

- 행동: 허용된 `GET /api/images` 요청.
- 결과: Storage 다운로드가 실패하면 404 `{ "error": "image_fetch_failed", "details": <메시지> }`. 성공하면 이미지 본문, `Content-Type`(없으면 `image/png`), `Cache-Control: public, max-age=31536000, immutable`이다.
- 테스트 층: 단위

### IMG-7. 업로드는 관리자만 한다

- 행동: 비관리자가 `POST /api/images`를 보낸다.
- 결과: `requireAdmin`이 리다이렉트하고 Storage에 아무것도 올리지 않는다.
- 테스트 층: 단위

### IMG-8. 업로드 버킷은 공개 범위로 정하고 그 밖의 값은 400이다

- 행동: 관리자가 `multipart/form-data`의 `visibility`를 넣어 `POST /api/images`를 보낸다.
- 결과: `public` → `post-images-public`, `private` → `post-images-private`. 그 밖이면 400 `{ "error": "공개 범위(visibility)는 public 또는 private 이어야 합니다." }`. `files`가 없으면 400 `{ "error": "업로드할 파일이 없습니다." }`.
- 테스트 층: 단위

### IMG-9. 이미지가 아닌 파일은 400으로 거절한다

- 행동: `files` 중 하나의 `type`이 `image/`로 시작하지 않는다.
- 결과: 400 `{ "error": "이미지 파일만 업로드할 수 있어요." }`. 그 파일 앞에서 이미 올린 파일은 남는다(§7).
- 테스트 층: 단위

### IMG-10. 업로드한 이미지는 날짜 폴더에 UUID 이름으로 저장하고 키 목록을 돌려준다

- 행동: 관리자가 이미지 파일을 올린다.
- 결과: 경로는 `<YYYY-MM-DD(UTC)>/<uuid>.<확장자>`, `upsert: false`. 응답은 200 `{ "keys": ["<버킷>:<경로>", …] }`. 확장자는 MIME 하위 타입 또는 파일 이름에서 영숫자만 10자까지, 없으면 `bin`이다. Storage 오류는 500 `{ "error": "upload_failed", "details": <메시지> }`.
- 테스트 층: 단위

### IMG-11. 첨부 이미지가 없으면 그리드를 그리지 않는다

- 행동: `PostImages`에 빈 배열이나 `undefined`를 넘긴다.
- 결과: 아무것도 렌더링하지 않는다. 이미지가 있으면 키마다 `coverSrcFromImageKey` 주소로 `next/image`를 2열 그리드(작은 화면 1열)로 그린다.
- 테스트 층: 컴포넌트(jsdom)

## 4. 계약

- `GET /api/images?bucket=<버킷>&path=<경로>` — `post-images-public`은 누구나, 그 밖의 버킷은 관리자. 200 이미지 본문 | 400 | 404 | 리다이렉트(권한).
- `POST /api/images` — 관리자. `multipart/form-data`: `visibility`(`public|private`), `files`(여러 개). 200 `{ keys: string[] }` | 400 | 500 | 리다이렉트(권한).
- 이미지 키 형식: `<버킷>:<경로>`. 글의 `image_keys`·`thumbnail_image_key`에 저장한다.
- `coverSrcFromImageKey(key: string): string`.

## 5. 데이터

- Supabase Storage 버킷 `post-images-public`(공개), `post-images-private`(비공개). 버킷 생성·정책은 저장소의 마이그레이션에 없다(§7).
- 모든 Storage 접근은 service role 클라이언트로 한다.

## 6. 불변식

- 1 비공개 격리: 비공개 버킷은 관리자만 프록시로 받는다(IMG-5).
- 2 관리자 판정: 업로드·비공개 조회 첫 줄의 `requireAdmin`(IMG-5·IMG-7). 판정 자체의 현행 결함은 auth §7.
- 6 비밀값은 서버에만: service role은 라우트 핸들러(`runtime = "nodejs"`)에서만 쓴다.

## 7. 미결·확인 필요

- 본문 편집기(`CkEditor`)의 이미지 업로드는 글의 공개 범위와 상관없이 항상 `visibility=public`으로 올린다. 비공개 글·다이어리 본문에 넣은 이미지가 공개 버킷 URL로 누구에게나 열린다(불변식 1 위반 가능).
- 비공개 버킷 응답에도 `Cache-Control: public, max-age=31536000, immutable`을 붙인다. 공유 캐시(CDN·프록시)에 남지 않도록 `private`으로 바꾸는 것을 검토한다.
- `bucket` 쿼리를 그대로 Storage 버킷 이름으로 쓴다. 관리자는 어떤 버킷이든 읽을 수 있다(관리자 판정이 뚫리면 모든 버킷이 열린다, auth §7).
- 여러 파일 중간에 실패하면 앞서 올린 파일이 Storage에 남는다(정리 없음).
- `image/svg+xml`도 이미지로 받아 공개 버킷에 올린다. SVG 안의 스크립트가 Storage 도메인에서 실행될 수 있다.
- API 경로인데 권한 실패를 401·403이 아니라 로그인·홈 리다이렉트로 돌려준다.
- `https://…` 같은 외부 URL은 `:` 때문에 버킷 키로 잘못 읽혀 프록시 경로가 된다(IMG-3). 현재 저장 데이터는 모두 `버킷:경로` 형식으로 보인다.
- 버킷 생성과 Storage 정책이 저장소에 없어 새 Supabase 프로젝트에서 재현할 수 없다.

## 8. 관련 코드

- `app/_components/PostEditor.tsx`(posts 명세)의 첨부·썸네일 업로드가 `POST /api/images`를 부른다.
- `app/_components/CkEditor.tsx`(posts 명세)의 `MyBlogImageUploadAdapter`가 본문 이미지를 `POST /api/images`(`visibility=public`)로 올린다.
- 아티클 목록·상세, 피드 카드, 다이어리 화면(article·feed·diary 명세)이 `coverSrcFromImageKey`·`PostImages`로 썸네일과 첨부 이미지를 그린다.
