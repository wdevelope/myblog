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
      setError(payload?.error ?? "Failed to post comment");
      return;
    }

    setContent("");
    startTransition(() => router.refresh());
  }

  return (
    <div className="mt-6 space-y-2">
      <label className="block text-sm font-medium">Comment</label>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-zinc-950 dark:focus:ring-white/20"
        placeholder="Write a comment…"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        onClick={submit}
        disabled={isPending}
        className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        Post
      </button>
    </div>
  );
}

