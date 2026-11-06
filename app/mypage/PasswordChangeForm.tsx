"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { authErrorMessage } from "@/lib/authError";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/app/_components/ui";

const inputClassName =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground outline-none focus:border-primary/60 sm:text-sm";

// 로그인 폼과 같은 규칙(8자 이상·확인 입력)이다. 그 밖의 규칙은 Supabase Auth가 판정한다.
export default function PasswordChangeForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit = password.length >= 8 && password === confirmPassword && !pending;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setPending(true);
    const { error } = await createSupabaseBrowserClient().auth.updateUser({ password });
    setPending(false);
    if (error) {
      setError(authErrorMessage(error.code));
      return;
    }
    setPassword("");
    setConfirmPassword("");
    toast.success("비밀번호를 바꿨어요.");
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-foreground">새 비밀번호</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClassName}
          placeholder="8자 이상"
          autoComplete="new-password"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-foreground">새 비밀번호 확인</span>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={inputClassName}
          placeholder="비밀번호를 다시 입력"
          autoComplete="new-password"
        />
      </label>
      {mismatch ? <p className="text-xs text-danger">비밀번호가 일치하지 않습니다.</p> : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!canSubmit}
        >
          비밀번호 변경
        </Button>
      </div>
    </form>
  );
}
