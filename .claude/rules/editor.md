---
paths:
  - "lib/markdown*.ts"
  - "lib/image-options.ts"
  - "app/globals.css"
  - "app/_components/MarkdownContent*"
  - "app/_components/MarkdownEditor*"
  - "app/_components/PostEditor*"
  - "app/_components/PostSettingsPanel*"
  - "app/_components/usePostDraft*"
---
# 본문·에디터 규칙 (CLAUDE.md 구조)

- 본문: 마크다운으로 저장한다. 렌더링은 `lib/markdown.ts`의 `renderMarkdown`(markdown-it, `html: false` + 형광펜 `==`·밑줄 `++`·수식 KaTeX) 하나이고, 화면은 `MarkdownContent`로 그린다. raw HTML을 끄는 것이 본문 XSS 방어이므로 `html: true`나 `rehype-raw`류로 바꾸지 않는다. 클라이언트 컴포넌트에서 렌더러를 import하지 않는다(공개 번들에 markdown-it·KaTeX가 실린다). 서버에서 만든 본문을 props로 넘긴다(예: `FeedCard`). 쓰기 화면은 공개 번들이 아니라서 `lib/markdown`을 쓴다(작성 칸의 표 위젯, `PostEditor`의 피드 자동 제목). 자동 링크는 `https://`가 없으면 `com`·`net`·`org`·`kr` 주소만 잇고, 주소 끝에 붙은 한글은 호스트 뒤에서 끊는다.
- 본문 규격: 글자·간격·들여쓰기 값은 `app/globals.css`의 `--md-*` 한 벌을 글 화면(`.markdown-body`)과 작성 칸(`.markdown-editor`)이 같이 쓴다. 어느 쪽 모양을 바꾸든 두 곳을 같이 고치고, 같은 원문을 두 화면에 띄워 글자 위치를 비교한다. 블록 사이는 쓴 빈 줄만큼만 벌어지고 빈 줄 하나가 한 칸(`--md-line`)이다. `renderMarkdown`이 블록 앞 빈 줄 수를 `margin-top`으로 넣는다. 피드는 `markdown-compact` 크기다.
- 글 쓰기 화면: `PostEditor`가 값을 들고, 임시저장은 `usePostDraft`, 공개 범위·카테고리·이미지·발행은 `<dialog>`인 `PostSettingsPanel`이다. 카테고리 선택지는 페이지가 서버에서 읽어 넘긴다. 수정 화면은 연 글의 `updated_at`을 `savePost`에 넘기고, DB 값과 다르면 저장하지 않는다(옛 탭이 다른 기기의 수정과 사진을 지우지 않게). 그래서 `updated_at`을 바꾸지 않아야 할 쓰기(조회수)는 트리거에서 뺀다.
- 에디터: `MarkdownEditor`(CodeMirror 6 + 툴바, 미리보기 패널 없이 작성 칸에 바로 서식을 보인다).
  - 작성 칸은 `lib/markdown-syntax.ts`(Lezer 파서, `==`·`++`·`$`, 강조 여닫기는 글 화면처럼 cjk-friendly 규칙)로 읽고 `lib/markdown-live-preview.ts`가 기호를 커서 위치와 상관없이 숨기거나 위젯으로 바꾸고, 숨긴 기호는 커서가 한 덩어리로 건너뛴다.
  - 원문을 드러내는 곳은 커서가 링크 안에 있을 때의 링크와 커서 줄의 수식·표다. 코드 펜스와 Setext 밑줄은 늘 흐린 글자로 남고, 줄머리 기호는 공백을 치기 전까지 커서 줄에 보인다.
  - 목록은 줄을 `display: list-item`으로 그려 점·번호가 글 화면과 같은 모양으로 나온다. 줄에는 세로 `margin`을 쓰지 않는다(CodeMirror가 높이를 못 잰다).
  - 기호 앞뒤는 화면에서 같은 자리로 보이므로 `lib/markdown-hidden-marks.ts`가 트랜잭션 단계에서 커서를 문법이 깨지지 않는 쪽에 세우고 줄바꿈·지우기가 서식을 가르지 않게 다듬는다.
  - 글 화면 렌더러와 파서가 다르므로 본문 문법을 늘리면 markdown-it 플러그인과 Lezer 설정에 같이 넣고, `INLINE_STYLES`(`lib/markdown-live-preview.ts`)·`INLINE_MARKS`(`lib/markdown-hidden-marks.ts`)·글 화면과 작성 칸 CSS·툴바도 같이 고친다.
  - 툴바 동작은 `lib/markdown-edit.ts`의 순수 함수다.
  - 본문 이미지는 글의 공개 범위 버킷으로 올라가고 `![](<버킷>:<경로>)`로 들어간다. 크기·정렬은 주소 끝 조각(`#w=60&align=center`, `lib/image-options.ts`)에 담고, 렌더러는 검증한 값만 style·class로 옮긴다. 작성 칸 이미지는 누르면 선택되고 툴바·크기 손잡이가 뜬다(`lib/markdown-image-widget.ts`).
