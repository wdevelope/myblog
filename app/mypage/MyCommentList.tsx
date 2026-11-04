"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { postHref } from "@/lib/constants";
import { deleteComment } from "@/lib/actions/comments";
import { formatPostDate } from "@/lib/utils";
import type { MyComment } from "@/lib/types";

export default function MyCommentList({ comments }: { comments: MyComment[] }) {
  const router = useRouter();

  async function handleDelete(commentId: string) {
    if (!confirm("정말 이 댓글을 삭제하시겠습니까?\n대댓글이 있는 경우 함께 삭제됩니다.")) {
      return;
    }

    const result = await deleteComment(commentId);
    if (!result.success) {
      toast.error(result.error ?? "댓글 삭제에 실패했어요.");
      return;
    }

    router.refresh();
  }

  if (!comments.length) {
    return <p className="py-4 text-center text-xs text-muted">아직 작성한 댓글이 없습니다.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {comments.map((c) => (
        <li key={c.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            {c.post ? (
              <Link
                href={postHref(c.post.type, c.post.slug)}
                className="min-w-0 truncate font-bold text-foreground hover:text-primary"
              >
                {c.post.title}
              </Link>
            ) : null}
            {c.isReply ? <span>· 대댓글</span> : null}
            <span>· {formatPostDate(c.createdAt, "ko")}</span>
          </div>
          <p className="whitespace-pre-wrap text-xs leading-5 text-foreground/90">{c.content}</p>
          <button
            type="button"
            onClick={() => void handleDelete(c.id)}
            className="text-xs font-semibold text-red-500/80 transition hover:text-red-600"
          >
            삭제
          </button>
        </li>
      ))}
    </ul>
  );
}
