"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Comment } from "@/lib/types";
import {
  createComment as createCommentAction,
  deleteComment as deleteCommentAction,
} from "@/lib/actions/comments";

function formatRelativeTime(dateIso: string) {
  const now = Date.now();
  const then = new Date(dateIso).getTime();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));

  if (diffSec < 60) return "방금 전";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}일 전`;
}

function displayName(authorId?: string | null) {
  if (!authorId) return "사용자";
  return `사용자 ${authorId.slice(0, 6)}`;
}

function Avatar({ authorId }: { authorId?: string | null }) {
  const label = displayName(authorId);
  return (
    <div
      className="size-10 shrink-0 overflow-hidden rounded-full ring-1 ring-border"
      aria-label={label}
      title={label}
    >
      <Image
        src="/logo.png"
        alt={label}
        width={40}
        height={40}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function CommentComposer({
  placeholder,
  onSubmit,
  disabled,
  submitLabel,
}: {
  placeholder: string;
  onSubmit: (content: string) => Promise<void>;
  disabled?: boolean;
  submitLabel: string;
}) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        disabled={disabled || isPending}
        className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-xs text-foreground outline-none transition focus:border-primary/60 disabled:opacity-60"
        placeholder={placeholder}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <div className="flex items-center justify-end">
        <button
          type="button"
          disabled={disabled || isPending}
          onClick={() => {
            const text = content.trim();
            if (!text) return;
            setError(null);
            startTransition(() =>
              onSubmit(text)
                .then(() => setContent(""))
                .catch((e: unknown) => {
                  const message =
                    e && typeof e === "object" && "message" in e
                      ? String((e as { message: unknown }).message)
                      : "댓글 등록에 실패했어요.";
                  setError(message);
                })
            );
          }}
          className="inline-flex h-8 items-center justify-center rounded-xl bg-primary px-4 text-xs font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110 disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

export default function CommentsThread({
  postSlug,
  comments,
  canWrite,
  currentUserId,
  isAdmin,
}: {
  postSlug: string;
  comments: Comment[];
  canWrite: boolean;
  currentUserId?: string | null;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const { roots, repliesByParent } = useMemo(() => {
    const roots: Comment[] = [];
    const map = new Map<string, Comment[]>();
    for (const c of comments) {
      const parentId = c.parentId ?? null;
      if (!parentId) roots.push(c);
      else map.set(parentId, [...(map.get(parentId) ?? []), c]);
    }
    return { roots, repliesByParent: map };
  }, [comments]);

  async function createComment(content: string, parentId?: string | null) {
    const result = await createCommentAction({
      postSlug,
      content,
      parentId: parentId ?? undefined,
    });

    if (!result.success) {
      throw new Error(result.error ?? "댓글 등록에 실패했어요.");
    }

    setReplyTo(null);
    router.refresh();
  }

  async function handleDelete(commentId: string) {
    if (!confirm("정말 이 댓글을 삭제하시겠습니까?\n대댓글이 있는 경우 함께 삭제됩니다.")) {
      return;
    }

    const result = await deleteCommentAction(commentId);
    if (!result.success) {
      alert(result.error ?? "댓글 삭제에 실패했어요.");
      return;
    }

    router.refresh();
  }

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-sm font-black tracking-tight text-foreground">
          댓글 {comments.length}개
        </h2>
      </div>

      <CommentComposer
        placeholder="댓글을 작성해주세요"
        onSubmit={(content) => createComment(content, null)}
        disabled={!canWrite}
        submitLabel="등록"
      />

      {comments.length ? (
        <div className="space-y-6">
          {roots.map((c) => {
            const replies = repliesByParent.get(c.id) ?? [];
            const openReply = replyTo === c.id;
            return (
              <div key={c.id} className="space-y-4">
                <div className="flex items-start gap-4">
                  <Avatar authorId={c.authorId} />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-foreground">
                        {displayName(c.authorId)}
                      </span>
                      <span className="text-muted">·</span>
                      <span className="text-muted">
                        {formatRelativeTime(c.createdAt)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-xs leading-5 text-foreground/90">
                      {c.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted">
                      <button
                        type="button"
                        onClick={() =>
                          setReplyTo((prev) => (prev === c.id ? null : c.id))
                        }
                        className="inline-flex items-center gap-2 font-semibold hover:text-foreground transition"
                      >
                        <span aria-hidden>💬</span>
                        대댓글
                      </button>

                      {(isAdmin || (currentUserId && currentUserId === c.authorId)) && (
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="inline-flex items-center gap-2 font-semibold text-red-500/80 hover:text-red-600 transition"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {openReply ? (
                  <div className="ml-14 border-l-2 border-border pl-5">
                    <CommentComposer
                      placeholder="대댓글을 작성해주세요…"
                      onSubmit={(content) => createComment(content, c.id)}
                      disabled={!canWrite}
                      submitLabel="등록"
                    />
                  </div>
                ) : null}

                {replies.length ? (
                  <div className="ml-14 space-y-4 border-l-2 border-border pl-5">
                    {replies.map((r) => (
                      <div key={r.id} className="flex items-start gap-4">
                        <Avatar authorId={r.authorId} />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-bold text-foreground">
                              {displayName(r.authorId)}
                            </span>
                            <span className="text-muted">·</span>
                            <span className="text-muted">
                              {formatRelativeTime(r.createdAt)}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-xs leading-5 text-foreground/90">
                            {r.content}
                          </p>
                          {(isAdmin || (currentUserId && currentUserId === r.authorId)) && (
                            <div className="flex items-center gap-4 text-xs text-muted">
                              <button
                                type="button"
                                onClick={() => handleDelete(r.id)}
                                className="inline-flex items-center gap-2 font-semibold text-red-500/80 hover:text-red-600 transition"
                              >
                                삭제
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl bg-transparent px-6 py-6 text-center">
          <p className="text-xs text-muted">아직 작성된 댓글이 없습니다.</p>
        </div>
      )}
    </section>
  );
}
