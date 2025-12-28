"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function CommentForm({ postSlug }: { postSlug: string }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function submit() {
    setError(null);
    const text = content.trim();
    if (!text) return;

    const response = await fetch("/api/comments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ postSlug, content: text }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "댓글 등록에 실패했어요.");
      return;
    }

    setContent("");
    startTransition(() => router.refresh());
  }

  return (
    <div className="mt-6 space-y-2">
      <label className="block text-sm font-semibold text-foreground">
        댓글
      </label>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/60"
        placeholder="댓글을 입력하세요…"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        onClick={submit}
        disabled={isPending}
        className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110 disabled:opacity-50"
      >
        등록
      </button>
    </div>
  );
}
