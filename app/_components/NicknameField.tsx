"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { NICKNAME_MESSAGES, nicknameProblem, type NicknameStatus } from "@/lib/nickname";
import { Button } from "@/app/_components/ui";

// 가입 폼과 마이페이지가 같이 쓴다. 확인을 통과한 닉네임을 onVerified로 알리고, 부모는 그 값이 지금 입력과 같을 때만
// 저장·가입 버튼을 켠다(확인한 뒤 글자를 바꾸면 다시 확인해야 한다). 버튼은 편의용이고 최종 판정은 저장할 때 DB가 한다.
export default function NicknameField({
  id,
  value,
  onChange,
  onVerified,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onVerified: (nickname: string | null) => void;
}) {
  const [result, setResult] = useState<{ name: string; status: NicknameStatus } | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = value.trim();
  const status = result?.name === trimmed ? result.status : null;

  async function check() {
    setError(null);
    const problem = nicknameProblem(trimmed);
    if (problem) {
      setResult({ name: trimmed, status: problem });
      onVerified(null);
      return;
    }

    setChecking(true);
    const { data, error } = await createSupabaseBrowserClient().rpc("check_nickname", { name: trimmed });
    setChecking(false);
    if (error) {
      setResult(null);
      onVerified(null);
      setError("중복확인에 실패했어요. 다시 시도해 주세요.");
      return;
    }

    const checked = data as NicknameStatus;
    setResult({ name: trimmed, status: checked });
    onVerified(checked === "ok" ? trimmed : null);
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-foreground">
        닉네임
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-base text-foreground outline-none focus:border-primary sm:text-sm"
          placeholder="한글·영문·숫자·_ 2~12자"
          autoComplete="nickname"
        />
        <Button
          onClick={() => void check()}
          disabled={!trimmed || checking}
          variant="secondary" size="lg" className="shrink-0 px-4"
        >
          중복확인
        </Button>
      </div>
      {status ? (
        <p className={status === "ok" ? "text-xs text-success" : "text-xs text-danger"}>
          {NICKNAME_MESSAGES[status]}
        </p>
      ) : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
