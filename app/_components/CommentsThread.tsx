"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import type { Comment } from "@/lib/types";
import { useSessionUser } from "@/app/_components/useSessionUser";
import UserAvatar from "@/app/_components/UserAvatar";
import { formatPostDate, userDisplayName } from "@/lib/utils";
import { avatarSrc } from "@/lib/avatar";
import { ACTION_FAILED, COMMENT_CONTENT_MAX } from "@/lib/constants";
import { resetUserProfile } from "@/lib/actions/profile";
import {
  createComment as createCommentAction,
  deleteComment as deleteCommentAction,
} from "@/lib/actions/comments";
import { Button, ButtonLink } from "@/app/_components/ui";

function displayName(comment: Comment) {
  return userDisplayName(comment.authorId, comment.authorIsAdmin, comment.authorNickname);
}

function CommentItem({ comment, children }: { comment: Comment; children?: React.ReactNode }) {
  const name = displayName(comment);

  return (
    <div className="flex items-start gap-4">
      <UserAvatar isAdmin={comment.authorIsAdmin} label={name} src={avatarSrc(comment.authorAvatarPath)} />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-foreground">{name}</span>
          <span className="text-muted">·</span>
          <span className="text-muted">{formatPostDate(comment.createdAt, "ko")}</span>
        </div>
        <p className="whitespace-pre-wrap break-words text-xs leading-5 text-foreground/90">{comment.content}</p>
        {children}
      </div>
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
        aria-label={placeholder}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        maxLength={COMMENT_CONTENT_MAX}
        disabled={disabled || isPending}
        className="w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-base text-foreground outline-none transition focus:border-primary disabled:opacity-60 sm:text-xs"
        placeholder={placeholder}
      />
      {error ? <p className="text-xs text-danger">{error}</p> : null}
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
    }).catch(() => ACTION_FAILED);

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

    const result = await deleteCommentAction(commentId).catch(() => ACTION_FAILED);
    if (!result.success) {
      toast.error(result.error ?? "댓글 삭제에 실패했어요.");
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

    const result = await resetUserProfile(comment.authorId).catch(() => ACTION_FAILED);
    if (!result.success) {
      toast.error(result.error ?? "프로필을 되돌리지 못했어요.");
      return;
    }

    router.refresh();
  }

  function canDelete(comment: Comment) {
    return Boolean(isAdmin || (currentUserId && currentUserId === comment.authorId));
  }

  function deleteButton(comment: Comment) {
    if (!canDelete(comment)) return null;
    return (
      <button
        type="button"
        onClick={() => handleDelete(comment.id)}
        className="inline-flex items-center gap-2 font-semibold text-danger transition hover:opacity-90"
      >
        삭제
      </button>
    );
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
                <CommentItem comment={c}>
                  <div className="flex items-center gap-4 text-xs text-muted">
                    {canWrite ? (
                      <button
                        type="button"
                        onClick={() =>
                          setReplyTo((prev) => (prev === c.id ? null : c.id))
                        }
                        aria-expanded={openReply}
                        className="inline-flex items-center gap-2 font-semibold hover:text-foreground transition"
                      >
                        <MessageCircle className="size-3.5" aria-hidden />
                        대댓글
                      </button>
                    ) : null}
                    {deleteButton(c)}
                    {resetProfileButton(c)}
                  </div>
                </CommentItem>

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
                      <CommentItem key={r.id} comment={r}>
                        {canDelete(r) && (
                          <div className="flex items-center gap-4 text-xs text-muted">
                            {deleteButton(r)}
                            {resetProfileButton(r)}
                          </div>
                        )}
                      </CommentItem>
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
