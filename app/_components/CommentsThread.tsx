"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import type { Comment } from "@/lib/types";
import { useSessionUser } from "@/app/_components/useSessionUser";
import UserAvatar from "@/app/_components/UserAvatar";
import { formatPostDate, userDisplayName } from "@/lib/utils";
import { avatarSrc } from "@/lib/avatar";
import { resetUserProfile } from "@/lib/actions/profile";
import {
  createComment as createCommentAction,
  deleteComment as deleteCommentAction,
} from "@/lib/actions/comments";
import { Button, ButtonLink } from "@/app/_components/ui";

function displayName(comment: Comment) {
  return userDisplayName(comment.authorId, comment.authorIsAdmin, comment.authorNickname);
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
        className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-base text-foreground outline-none transition focus:border-primary/60 disabled:opacity-60 sm:text-xs"
        placeholder={placeholder}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <div className="flex items-center justify-end">
        <Button
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
          size="xs"
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

// 댓글 목록은 정적 HTML에 들어가고, 누가 보는지는 서버가 모르므로 쓰기·삭제 버튼만 브라우저 세션으로 정한다.
export default function CommentsThread({
  postSlug,
  comments,
  isAdmin,
}: {
  postSlug: string;
  comments: Comment[];
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const { user } = useSessionUser();
  const currentUserId = user?.id ?? null;
  const canWrite = Boolean(currentUserId);

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

  // 관리자 화면에서 부적절한 닉네임·사진을 내린다(18절). 관리자 댓글은 원래 로고·Owen이라 대상이 아니다.
  function canResetProfile(comment: Comment) {
    return Boolean(
      isAdmin &&
        !comment.authorIsAdmin &&
        comment.authorId &&
        (comment.authorNickname || comment.authorAvatarPath),
    );
  }

  async function handleResetProfile(comment: Comment) {
    if (!confirm(`${displayName(comment)}의 닉네임과 프로필 사진을 기본값으로 되돌릴까요?`)) {
      return;
    }

    const result = await resetUserProfile(comment.authorId);
    if (!result.success) {
      alert(result.error ?? "프로필을 되돌리지 못했어요.");
      return;
    }

    router.refresh();
  }

  function resetProfileButton(comment: Comment) {
    if (!canResetProfile(comment)) return null;
    return (
      <button
        type="button"
        onClick={() => handleResetProfile(comment)}
        className="inline-flex items-center gap-2 font-semibold hover:text-foreground transition"
      >
        프로필 초기화
      </button>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-sm font-black tracking-tight text-foreground">
          댓글 {comments.length}개
        </h2>
      </div>

      {canWrite ? (
        <CommentComposer
          placeholder="댓글을 작성해주세요"
          onSubmit={(content) => createComment(content, null)}
          submitLabel="등록"
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3">
          <p className="text-xs text-muted">댓글은 로그인 후 작성할 수 있어요.</p>
          <ButtonLink
            href={`/login?from=${encodeURIComponent(`/article/${postSlug}`)}`}
            size="xs"
          >
            로그인하기
          </ButtonLink>
        </div>
      )}

      {comments.length ? (
        <div className="space-y-6">
          {roots.map((c) => {
            const replies = repliesByParent.get(c.id) ?? [];
            const openReply = replyTo === c.id;
            return (
              <div key={c.id} className="space-y-4">
                <div className="flex items-start gap-4">
                  <UserAvatar isAdmin={c.authorIsAdmin} label={displayName(c)} src={avatarSrc(c.authorAvatarPath)} />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-foreground">
                        {displayName(c)}
                      </span>
                      <span className="text-muted">·</span>
                      <span className="text-muted">
                        {formatPostDate(c.createdAt, "ko")}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-xs leading-5 text-foreground/90">
                      {c.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted">
                      {canWrite ? (
                        <button
                          type="button"
                          onClick={() =>
                            setReplyTo((prev) => (prev === c.id ? null : c.id))
                          }
                          className="inline-flex items-center gap-2 font-semibold hover:text-foreground transition"
                        >
                          <MessageCircle className="size-3.5" aria-hidden />
                          대댓글
                        </button>
                      ) : null}

                      {(isAdmin || (currentUserId && currentUserId === c.authorId)) && (
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="inline-flex items-center gap-2 font-semibold text-red-500/80 hover:text-red-600 transition"
                        >
                          삭제
                        </button>
                      )}

                      {resetProfileButton(c)}
                    </div>
                  </div>
                </div>

                {openReply ? (
                  <div className="ml-14 border-l-2 border-border pl-5">
                    <CommentComposer
                      placeholder="대댓글을 작성해주세요…"
                      onSubmit={(content) => createComment(content, c.id)}
                      submitLabel="등록"
                    />
                  </div>
                ) : null}

                {replies.length ? (
                  <div className="ml-14 space-y-4 border-l-2 border-border pl-5">
                    {replies.map((r) => (
                      <div key={r.id} className="flex items-start gap-4">
                        <UserAvatar isAdmin={r.authorIsAdmin} label={displayName(r)} src={avatarSrc(r.authorAvatarPath)} />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-bold text-foreground">
                              {displayName(r)}
                            </span>
                            <span className="text-muted">·</span>
                            <span className="text-muted">
                              {formatPostDate(r.createdAt, "ko")}
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
                              {resetProfileButton(r)}
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
