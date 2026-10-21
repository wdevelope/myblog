---
name: commit
description: 변경을 논리 단위로 나눠 한국어 Conventional Commit으로 커밋한다. "커밋해줘", "나눠서 커밋해줘", "commit"을 요청할 때 실행한다.
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git log:*), Bash(npm run:*), Bash(npm test:*)
---

# Commit (논리 단위 분할 & 한국어 커밋)

## 원칙

1. `git add .`·`git add -A`를 쓰지 않는다. 파일 경로를 적어 의미 단위로 스테이징한다.
2. 커밋 하나에 의도 하나(기능, 결함 수정, 설정, 리팩터링, 문서). 구현과 그 테스트는 같은 커밋에 넣는다.
3. 커밋 전에 `npm run lint && npm run typecheck && npm test`가 통과해야 한다. 실패하면 고친 뒤 커밋한다.
4. 사용자의 미커밋 변경 중 이번 작업과 무관한 것은 스테이징하지 않고 그대로 둔다.

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
3. 그룹마다 `git add <파일들>` → HEREDOC으로 커밋한다.
   ```bash
   git commit -m "$(cat <<'EOF'
   유형(범위): 한국어 요약

   - 변경 내용
   EOF
   )"
   ```
4. `git log -n <개수> --oneline`으로 결과를 보고한다.
5. `git push`는 Vercel 운영 배포다. 사용자가 명시적으로 요청하기 전에는 하지 않는다.
