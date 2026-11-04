"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeRedirectPath } from "@/lib/redirect";
import { enableAdminMode } from "@/lib/adminMode";
import { cn } from "@/lib/utils";
import NicknameField from "@/app/_components/NicknameField";
import { toast } from "sonner";
import { Button } from "@/app/_components/ui";

const REMEMBER_EMAIL_KEY = "myblog:remember_email";
const SAVED_EMAIL_KEY = "myblog:saved_email";
// 가입 트리거(profiles)가 닉네임 제약에 걸리면 Auth가 원인 없이 이 문구만 돌려준다. 중복확인을 통과했으니 그 사이에
// 다른 사람이 같은 닉네임으로 가입한 경우다(18절 결정 5).
const SIGNUP_DB_ERROR = "Database error saving new user";

function getRememberedEmail() {
  if (typeof window === "undefined") return { remember: false, email: "" };
  const remember = window.localStorage.getItem(REMEMBER_EMAIL_KEY) === "1";
  const saved = window.localStorage.getItem(SAVED_EMAIL_KEY) ?? "";
  return { remember, email: remember ? saved : "" };
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = safeRedirectPath(searchParams.get("from"));

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState(() => getRememberedEmail().email);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [verifiedNickname, setVerifiedNickname] = useState<string | null>(null);
  const [rememberEmail, setRememberEmail] = useState(
    () => getRememberedEmail().remember
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending] = useTransition();

  const canSubmit = useMemo(
    () =>
      email.trim().length > 0 &&
      password.length >= 8 &&
      (mode === "login" ||
        (password === confirmPassword && verifiedNickname === nickname.trim())),
    [confirmPassword, email, mode, nickname, password, verifiedNickname]
  );

  async function submit() {
    setError(null);
    setNotice(null);
    const supabase = createSupabaseBrowserClient();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;
    if (mode === "signup" && password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    const promise = (async () => {
      const result = await (mode === "login"
        ? supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        })
        : supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin
              }/auth/callback?next=${encodeURIComponent(from)}`,
            data: { nickname: nickname.trim() },
          },
        }));

      if (result.error) {
        if (mode === "signup" && result.error.message.includes(SIGNUP_DB_ERROR)) {
          setVerifiedNickname(null);
          throw new Error("그 사이 다른 사람이 이 닉네임으로 가입했어요. 다른 닉네임으로 다시 시도해 주세요.");
        }
        throw new Error(result.error.message);
      }

      const hasSession = Boolean(result.data?.session);
      if (!hasSession && mode === "signup") {
        setNotice(
          "가입 확인 이메일을 보냈어요. 메일의 링크를 클릭하면 로그인됩니다."
        );
        setMode("login");
        return "가입 확인 이메일 발송 완료";
      }

      if (mode === "login" && typeof window !== "undefined") {
        if (rememberEmail) {
          window.localStorage.setItem(REMEMBER_EMAIL_KEY, "1");
          window.localStorage.setItem(SAVED_EMAIL_KEY, trimmedEmail);
        } else {
          window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
          window.localStorage.removeItem(SAVED_EMAIL_KEY);
        }
      }

      // 관리자면 이동할 화면을 관리자 화면으로 렌더링한다. is_admin은 표시용이고 켜기는 서버가 다시 판정한다.
      // 켜지 못해도(세션 지연 등) 로그인은 끝났으므로 그대로 이동하고, 헤더의 AdminModeSync가 다시 켠다.
      if (result.data.user?.app_metadata?.is_admin === true) {
        await enableAdminMode();
      }
      router.replace(from);
      router.refresh();

      return mode === "login" ? "로그인 완료" : "회원가입 완료";
    })();

    toast.promise(promise, {
      loading: mode === "login" ? "로그인 중..." : "회원가입 중...",
      success: (data) => data,
      error: (err: Error) => err.message,
    });
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-border bg-surface shadow-lg shadow-black/20">
        <div className="border-b border-border px-7 py-6">
          <h1 className="text-xl font-black tracking-tight text-foreground">
            {mode === "login" ? "로그인" : "회원가입"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            댓글 작성은 로그인 사용자만 가능합니다.
          </p>
        </div>

        <div className="space-y-5 px-7 py-6">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("login")}
              aria-pressed={mode === "login"}
              className={cn(
                "h-9 flex-1 rounded-xl border px-3 text-sm font-semibold",
                mode === "login"
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border bg-surface text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              aria-pressed={mode === "signup"}
              className={cn(
                "h-9 flex-1 rounded-xl border px-3 text-sm font-semibold",
                mode === "signup"
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border bg-surface text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              회원가입
            </button>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-foreground">
              이메일
            </span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground outline-none focus:border-primary/60 sm:text-sm"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          {mode === "signup" ? (
            <NicknameField
              id="signup-nickname"
              value={nickname}
              onChange={setNickname}
              onVerified={setVerifiedNickname}
            />
          ) : null}

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-foreground">
              비밀번호
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground outline-none focus:border-primary/60 sm:text-sm"
              placeholder="8자 이상"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
          </label>

          {mode === "signup" ? (
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-foreground">
                비밀번호 확인
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground outline-none focus:border-primary/60 sm:text-sm"
                placeholder="비밀번호를 다시 입력"
                autoComplete="new-password"
              />
            </label>
          ) : (
            <label className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
              <span className="text-sm font-semibold text-foreground">
                아이디 저장
              </span>
              <span className="relative inline-flex items-center">
                <input
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(e) => setRememberEmail(e.target.checked)}
                  className="peer sr-only"
                  aria-label="아이디 저장"
                />
                <span className="h-6 w-11 rounded-full border border-border bg-surface-2 transition peer-checked:border-primary/30 peer-checked:bg-primary/20" />
                <span className="absolute left-1 top-1 size-4 rounded-full bg-surface shadow-sm transition peer-checked:translate-x-5" />
              </span>
            </label>
          )}

          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {notice ? <p className="text-sm text-success">{notice}</p> : null}

          <Button
            onClick={submit}
            disabled={!canSubmit || isPending}
            size="lg" className="w-full"
          >
            {mode === "login" ? "로그인" : "계정 만들기"}
          </Button>
        </div>
      </div>
    </div>
  );
}
