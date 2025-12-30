"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

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

    const response = await fetch(`/api/posts/${encodeURIComponent(slug)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      toast.error("삭제에 실패했어요.");
      return;
    }

    toast.success("삭제 완료");
    if (redirectTo) router.replace(redirectTo);
    router.refresh();
  }

  return (
    <button type="button" onClick={() => void onDelete()} className={className}>
      {children}
    </button>
  );
}

