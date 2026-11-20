---
name: commit
description: 변경을 논리 단위로 나눠 한국어 Conventional Commit으로 커밋한다. "커밋해줘", "나눠서 커밋해줘", "commit"을 요청할 때 실행한다.
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git log:*), Bash(git show:*), Bash(npm run:*), Bash(npm test:*)
---

# Commit (논리 단위 분할 & 한국어 커밋)

## 원칙

1. 경로 지정 커밋: 다른 세션이 같은 체크아웃의 스테이징 영역을 쓸 수 있으므로 스테이징에 모아 커밋하지 않는다. 새 파일만 `git add -N <파일>`로 추적시키고 `git commit -m … -- <경로들>`로 그 경로만 커밋한다. `git add .`·`git add -A`·`git commit -a`는 쓰지 않는다.
2. 커밋 하나에 의도 하나(기능, 결함 수정, 설정, 리팩터링, 문서). 구현과 그 테스트는 같은 커밋에 넣고, 그 작업으로 바뀐 로드맵·작업 목록·CLAUDE.md·`.claude/rules`도 같은 커밋에 넣는다.
3. 커밋하는 코드는 `npm run lint && npm run typecheck && npm test`를 통과한 상태여야 한다. 실패하면 고친 뒤 커밋한다. 이번 대화에서 이미 통과했고 그 뒤 코드가 바뀌지 않았거나, 문서·`.claude`만 바뀌었으면 다시 돌리지 않는다.
4. 사용자의 미커밋 변경 중 이번 작업과 무관한 것은 커밋 경로에 넣지 않고 그대로 둔다.
5. `--amend`·`--no-verify`(`-n`)는 쓰지 않는다. 사용자가 그 커밋을 짚어 요청할 때만 쓴다(`.claude/settings.json`의 `ask` 규칙이 그때도 확인을 받는다).

## 메시지 형식

```text
유형(범위): 한국어 요약

- 변경 이유(Why) 또는 구체적 변경 내용(What)
- 주요 영향 범위
```

- 유형: `feat`·`fix`·`refactor`·`perf`·`test`·`docs`·`build`·`ci`·`chore`·`style`. 범위는 생략할 수 있다(예: `fix(auth): …`).
- 제목·본문 모두 한국어로 쓴다.

## 절차

1. `git status -s`와 `git diff`로 변경을 전수 조사하고 무관한 변경을 가려낸다.
2. 논리 그룹을 정하고 분할 계획을 사용자에게 한 줄로 알린다.
3. 그룹마다 새 파일(`??`)만 `git add -N <파일>`로 추적시키고, 그 그룹의 파일을 모두 `--` 뒤에 적어 HEREDOC으로 커밋한다. 지우거나 이름을 바꾼 파일은 옛 경로도 적는다.
   ```bash
   git commit -m "$(cat <<'EOF'
   유형(범위): 한국어 요약

   - 변경 내용
   EOF
   )" -- <경로1> <경로2>
   ```
4. `git show --stat --oneline HEAD`로 들어간 파일을 확인한다. 다른 파일이 섞였으면 되돌리지 말고 보고한다.
5. `git log -n <개수> --oneline`으로 결과를 보고한다.
6. push는 하지 않는다(Vercel 운영 배포). 사용자가 요청하면 `push` 스킬로 한다.
