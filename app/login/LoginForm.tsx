"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const REMEMBER_EMAIL_KEY = "myblog:remember_email";
const SAVED_EMAIL_KEY = "myblog:saved_email";

function getRememberedEmail() {
  if (typeof window === "undefined") return { remember: false, email: "" };
  const remember = window.localStorage.getItem(REMEMBER_EMAIL_KEY) === "1";
  const saved = window.localStorage.getItem(SAVED_EMAIL_KEY) ?? "";
  return { remember, email: remember ? saved : "" };
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const from = searchParams.get("from") ?? "/";
  const loggedOut = searchParams.get("logged_out") === "1";

  useEffect(() => {
    if (!loggedOut) return;
    toast.success("로그아웃 완료");

    const next = new URLSearchParams(searchParamsString);
    next.delete("logged_out");
    const qs = next.toString();
    router.replace(qs ? `/login?${qs}` : "/login");
  }, [loggedOut, router, searchParamsString]);

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState(() => getRememberedEmail().email);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(
    () => getRememberedEmail().remember
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit = useMemo(
    () =>
      email.trim().length > 0 &&
      password.length >= 8 &&
      (mode === "login" || password === confirmPassword),
    [confirmPassword, email, mode, password]
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
              }/auth/callback?next=${encodeURIComponent(
                from.startsWith("/") ? from : "/"
              )}`,
          },
        }));

      if (result.error) {
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

      router.replace(from.startsWith("/") ? from : "/");
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
              className={[
                "h-9 flex-1 rounded-xl border px-3 text-sm font-semibold",
                mode === "login"
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border bg-surface text-muted hover:bg-surface-2 hover:text-foreground",
              ].join(" ")}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={[
                "h-9 flex-1 rounded-xl border px-3 text-sm font-semibold",
                mode === "signup"
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border bg-surface text-muted hover:bg-surface-2 hover:text-foreground",
              ].join(" ")}
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
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary/60"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-foreground">
              비밀번호
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary/60"
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
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary/60"
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

          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          {notice ? <p className="text-sm text-emerald-600">{notice}</p> : null}

          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || isPending}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110 disabled:opacity-50"
          >
            {mode === "login" ? "로그인" : "계정 만들기"}
          </button>
        </div>
      </div>
    </div>
  );
}
