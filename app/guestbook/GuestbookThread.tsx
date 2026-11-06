"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import UserAvatar from "@/app/_components/UserAvatar";
import { useSessionUser } from "@/app/_components/useSessionUser";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createGuestbookEntry, deleteGuestbookEntry } from "@/lib/actions/guestbook";
import { resetUserProfile } from "@/lib/actions/profile";
import { avatarSrc } from "@/lib/avatar";
import { ACTION_FAILED } from "@/lib/constants";
import { GUESTBOOK_CONTENT_MAX, type GuestbookEntry } from "@/lib/guestbook";
import { formatPostDate, userDisplayName } from "@/lib/utils";
import { Button, ButtonLink } from "@/app/_components/ui";

const LOGIN_HREF = `/login?from=${encodeURIComponent("/guestbook")}`;

function displayName(entry: GuestbookEntry) {
  return userDisplayName(entry.authorId, entry.authorIsAdmin, entry.authorNickname);
}

// 정적 목록에는 비밀글 내용이 없다. 로그인한 사람이 볼 수 있는 것(내 비밀글, 내 비밀글에 달린 답글)만
// 브라우저 세션으로 RLS를 거쳐 읽는다. 그런 글이 없으면 요청하지 않는다.
function useMySecretContents(entries: GuestbookEntry[], userId: string | null) {
  const key = useMemo(() => {
    if (!userId) return "";
    const authorById = new Map(entries.map((e) => [e.id, e.authorId]));
    return entries
      .filter(
        (e) =>
          e.isSecret &&
          e.content === null &&
          (e.authorId === userId || (e.parentId !== null && authorById.get(e.parentId) === userId)),
      )
      .map((e) => e.id)
      .join(",");
  }, [entries, userId]);

  const [loaded, setLoaded] = useState<{ key: string; contents: Map<string, string> } | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    void createSupabaseBrowserClient()
      .from("guestbook_secret_contents")
      .select("entry_id,content")
      .in("entry_id", key.split(","))
      .then(({ data }) => {
        if (cancelled) return;
        setLoaded({ key, contents: new Map((data ?? []).map((row) => [row.entry_id, row.content])) });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return loaded && loaded.key === key ? loaded.contents : null;
}

function GuestbookComposer({
  label,
  placeholder,
  allowSecret,
  note,
  onSubmit,
}: {
  label: string;
  placeholder: string;
  allowSecret: boolean;
  note?: string;
  onSubmit: (content: string, isSecret: boolean) => Promise<string | null>;
}) {
  const [content, setContent] = useState("");
  const [isSecret, setIsSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    const text = content.trim();
    if (!text) {
      setError("내용을 입력해 주세요.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const message = await onSubmit(text, isSecret);
      if (message) {
        setError(message);
        return;
      }
      setContent("");
      setIsSecret(false);
    });
  }

  return (
    <div className="space-y-2">
      <textarea
        aria-label={label}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        maxLength={GUESTBOOK_CONTENT_MAX}
        disabled={isPending}
        placeholder={placeholder}
        className="w-full resize-y rounded-2xl border border-border bg-transparent px-4 py-3 text-base text-foreground outline-none transition placeholder:text-muted focus:border-primary disabled:opacity-60 sm:text-sm"
      />
      {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {allowSecret ? (
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-foreground">
            <input
              type="checkbox"
              checked={isSecret}
              onChange={(e) => setIsSecret(e.target.checked)}
              disabled={isPending}
              className="size-4 accent-primary"
            />
            <Lock aria-hidden className="size-3.5 text-warning" />
            비밀글
            <span className="font-normal text-muted">관리자와 나만 볼 수 있어요</span>
          </label>
        ) : (
          <p className="text-xs text-muted">{note}</p>
        )}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs tabular-nums text-muted">
            {content.length}/{GUESTBOOK_CONTENT_MAX}
          </span>
          <Button
            onClick={submit}
            disabled={isPending}
            size="xs"
          >
            등록
          </Button>
        </div>
      </div>
    </div>
  );
}

// 목록은 정적 HTML에 들어가고 누가 보는지 서버가 모르므로, 쓰기 칸·삭제 버튼·내 비밀글 내용만 브라우저 세션으로 정한다.
// 관리자 화면(draft mode)에서는 서버가 비밀글 내용까지 넘기고 isAdmin이 켜진다.
export default function GuestbookThread({
  entries,
  isAdmin = false,
}: {
  entries: GuestbookEntry[];
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const { user } = useSessionUser();
  const currentUserId = user?.id ?? null;
  const secretContents = useMySecretContents(entries, isAdmin ? null : currentUserId);

  // 서버가 최신순으로 준다. 원글은 그대로 두고, 답글은 원글 아래에 오래된 순으로 놓는다.
  const { roots, repliesByParent } = useMemo(() => {
    const roots: GuestbookEntry[] = [];
    const map = new Map<string, GuestbookEntry[]>();
    for (const entry of entries) {
      if (!entry.parentId) roots.push(entry);
      else map.set(entry.parentId, [entry, ...(map.get(entry.parentId) ?? [])]);
    }
    return { roots, repliesByParent: map };
  }, [entries]);

  function contentOf(entry: GuestbookEntry) {
    return entry.content ?? secretContents?.get(entry.id) ?? null;
  }

  async function submit(content: string, isSecret: boolean, parentId?: string) {
    const result = await createGuestbookEntry({ content, isSecret, parentId }).catch(() => ACTION_FAILED);
    if (!result.success) return result.error;
    setReplyTo(null);
    router.refresh();
    return null;
  }

  async function handleDelete(entry: GuestbookEntry) {
    if (!confirm("정말 이 글을 삭제하시겠습니까?\n답글이 있는 경우 함께 삭제됩니다.")) {
      return;
    }
    const result = await deleteGuestbookEntry(entry.id).catch(() => ACTION_FAILED);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  // 댓글과 같다(18절). 관리자 글은 원래 로고·Owen이라 대상이 아니다.
  function canResetProfile(entry: GuestbookEntry) {
    return isAdmin && !entry.authorIsAdmin && Boolean(entry.authorNickname || entry.authorAvatarPath);
  }

  async function handleResetProfile(entry: GuestbookEntry) {
    if (!confirm(`${displayName(entry)}의 닉네임과 프로필 사진을 기본값으로 되돌릴까요?`)) {
      return;
    }
    const result = await resetUserProfile(entry.authorId).catch(() => ACTION_FAILED);
    if (!result.success) {
      toast.error(result.error ?? "프로필을 되돌리지 못했어요.");
      return;
    }
    router.refresh();
  }

  function renderEntry(entry: GuestbookEntry, canReply: boolean) {
    const content = contentOf(entry);
    const name = displayName(entry);
    const canDelete = isAdmin || (currentUserId !== null && currentUserId === entry.authorId);

    return (
      <div className="flex items-start gap-3 sm:gap-4">
        <UserAvatar isAdmin={entry.authorIsAdmin} label={name} src={avatarSrc(entry.authorAvatarPath)} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-foreground">{name}</span>
            <span className="text-muted">·</span>
            <span className="text-muted">{formatPostDate(entry.createdAt, "ko")}</span>
            {entry.isSecret && content !== null ? (
              <span className="inline-flex items-center gap-1 text-warning">
                <Lock aria-hidden className="size-3" />
                <span className="font-semibold">비밀글</span>
              </span>
            ) : null}
          </div>

          {content === null ? (
            <p className="inline-flex items-center gap-1.5 text-sm text-muted">
              <Lock aria-hidden className="size-3.5" />
              비밀글입니다
            </p>
          ) : (
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90">{content}</p>
          )}

          {canReply || canDelete || canResetProfile(entry) ? (
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
              {canReply ? (
                <button
                  type="button"
                  onClick={() => setReplyTo((prev) => (prev === entry.id ? null : entry.id))}
                  aria-expanded={replyTo === entry.id}
                  className="font-semibold transition hover:text-foreground"
                >
                  답글
                </button>
              ) : null}
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => handleDelete(entry)}
                  className="font-semibold text-danger transition hover:opacity-90"
                >
                  삭제
                </button>
              ) : null}
              {canResetProfile(entry) ? (
                <button
                  type="button"
                  onClick={() => handleResetProfile(entry)}
                  className="font-semibold transition hover:text-foreground"
                >
                  프로필 초기화
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {/* 다른 화면(댓글·목록)처럼 흰 카드 대신 배경 위에 테두리·구분선만 둔다. */}
      {currentUserId ? (
        <GuestbookComposer
          label="방명록 내용"
          placeholder="방명록을 남겨 주세요"
          allowSecret
          onSubmit={(content, isSecret) => submit(content, isSecret)}
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3">
          <p className="text-sm text-muted">방명록은 로그인 후 남길 수 있어요.</p>
          <ButtonLink
            href={LOGIN_HREF}
            size="xs"
          >
            로그인하기
          </ButtonLink>
        </div>
      )}

      <h2 className="text-sm font-black tracking-tight text-foreground">글 {roots.length}개</h2>

      {roots.length ? (
        <ul className="divide-y divide-border border-y border-border">
          {roots.map((entry) => {
            const replies = repliesByParent.get(entry.id) ?? [];
            return (
              <li key={entry.id} className="space-y-4 py-5">
                {renderEntry(entry, isAdmin)}

                {replyTo === entry.id ? (
                  <div className="ml-6 border-l-2 border-border pl-4 sm:ml-14 sm:pl-5">
                    <GuestbookComposer
                      label="답글 내용"
                      placeholder="답글을 남겨 주세요"
                      allowSecret={false}
                      note={entry.isSecret ? "비밀글에 단 답글은 작성자와 관리자만 볼 수 있어요." : undefined}
                      onSubmit={(content) => submit(content, false, entry.id)}
                    />
                  </div>
                ) : null}

                {replies.length ? (
                  <ul className="ml-6 space-y-4 border-l-2 border-border pl-4 sm:ml-14 sm:pl-5">
                    {replies.map((reply) => (
                      <li key={reply.id}>{renderEntry(reply, false)}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-10 text-center text-sm text-muted">아직 남겨진 글이 없어요. 첫 글을 남겨 주세요.</p>
      )}
    </section>
  );
}
