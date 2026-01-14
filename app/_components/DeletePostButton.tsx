"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deletePost } from "@/lib/actions/posts";

export default function DeletePostButton({
  slug,
  redirectTo,
  className,
  children = "삭제",
}: {
  slug: string;
  redirectTo?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();

  async function onDelete() {
    const ok = window.confirm("정말 삭제할까요? 이 작업은 되돌릴 수 없어요.");
    if (!ok) return;

    const promise = (async () => {
      const result = await deletePost(slug);
      if (!result.success) {
        throw new Error(result.error ?? "삭제에 실패했어요.");
      }

      if (redirectTo) router.replace(redirectTo);
      router.refresh();
      return "삭제 완료";
    })();

    toast.promise(promise, {
      loading: "삭제 중...",
      success: (data) => data,
      error: (err: Error) => err.message,
    });
  }

  return (
    <button type="button" onClick={() => void onDelete()} className={className}>
      {children}
    </button>
  );
}
