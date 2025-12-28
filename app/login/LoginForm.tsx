"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length >= 8,
    [email, password],
  );

  async function submit() {
    setError(null);
    setNotice(null);
    const supabase = createSupabaseBrowserClient();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    const result = await (mode === "login"
      ? supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        })
      : supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
              from.startsWith("/") ? from : "/",
            )}`,
          },
        }));

    if (result.error) {
      setError(result.error.message);
      return;
    }

    const hasSession = Boolean(result.data?.session);
    if (!hasSession && mode === "signup") {
      setNotice(
        "가입 확인 이메일을 보냈어요. 메일의 링크를 클릭하면 로그인됩니다.",
      );
      setMode("login");
      return;
    }

    startTransition(() => {
      router.replace(from.startsWith("/") ? from : "/");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-border bg-surface shadow-lg shadow-black/20">
        <div className="border-b border-border px-6 py-5">
          <h1 className="text-xl font-black tracking-tight text-foreground">
            {mode === "login" ? "Login" : "Sign up"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            댓글 작성은 로그인 사용자만 가능합니다.
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
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
              Login
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
              Sign up
            </button>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-foreground">Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary/60"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-foreground">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary/60"
              placeholder="At least 8 characters"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          {notice ? <p className="text-sm text-emerald-600">{notice}</p> : null}

          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || isPending}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110 disabled:opacity-50"
          >
            {mode === "login" ? "Login" : "Create account"}
          </button>
        </div>
      </div>
    </div>
  );
}
