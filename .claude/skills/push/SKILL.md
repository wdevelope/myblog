---
name: push
description: 커밋된 작업을 main에 합치고 원격에 push(=Vercel 운영 배포)하는 스킬. 사용자가 "push해줘", "푸시해줘", "배포해줘", "main에 반영해줘"를 명시적으로 요청할 때만 실행한다. 커밋은 commit 스킬로 한다.
---

# Push

main push는 Vercel 운영 배포다. 커밋 승인과 별개로 사용자가 push를 요청할 때만 한다.

1. **준비**: `git status -s`가 비어 있어야 한다. 미커밋 변경이 있으면 commit 스킬로 커밋할지 묻고, `stash`·`restore`로 치우지 않는다.
2. **main 반영**: 작업 브랜치면 main에서 `git merge --ff-only <브랜치>`로 옮긴다. 안 되면 브랜치에 최신 main을 합치고(`merge: 최신 main을 <브랜치>에 합치기`) `npm run lint && npm run typecheck && npm test`를 다시 돌린 뒤 옮긴다. rebase는 요청할 때만 한다.
3. **push 전 확인**: 이번에 나갈 커밋(`git log origin/main..main --oneline`)을 보고 다음을 알린다.
   - 마이그레이션: `git diff --name-only origin/main..main -- supabase/migrations`에 파일이 있으면 개발 DB에 적용됐는지 MCP `list_migrations`로 보고, 운영 적용을 push 전·후 중 언제 할지 알린다(새 열·함수에 기대는 코드는 DB 먼저, 지우는 변경은 배포 뒤). 운영 적용은 사용자 확인 뒤 MCP `apply_migration`으로 한다.
   - 환경 변수: `git diff origin/main..main -- .env.example`에 새 이름이 있으면 Vercel 프로젝트에 값을 넣었는지 묻는다. 값은 사용자가 넣는다.
4. **push**: `git push origin main`. 권한 확인을 우회하지 않는다.
5. **push 뒤**: CI는 `gh run list --branch main --limit 3`, 배포는 Vercel MCP `list_deployments`로 결과를 확인해 보고한다. 실패하면 로그를 읽고 원인을 보고한다.
