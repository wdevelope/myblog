#!/bin/sh
# Read·Edit deny 규칙은 Bash 명령에 걸리지 않으므로, 셸로 비밀 .env 파일을 건드리는 명령을 여기서 막는다.
# .env.example과 process.env 같은 코드 속 이름은 통과한다. 글롭(.en*)까지 막지는 못하는 보조 장치다.
cmd=$(jq -r '.tool_input.command // empty')
if printf '%s' "$cmd" | perl -0ne 'exit(/(?<![\w])\.env(?:\.local|\.production|\.development|\.test|\.[A-Za-z]+\.local)?(?![\w.])/ ? 0 : 1)'; then
  echo "비밀 .env 파일을 건드리는 셸 명령은 막혀 있다(.env.example만 허용). 변수 이름은 .env.example에서 본다." >&2
  exit 2
fi
exit 0
