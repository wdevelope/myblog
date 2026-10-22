"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteAccount } from "@/lib/actions/account";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function DeleteAccountButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!confirm("정말 탈퇴하시겠습니까?\n계정과 작성한 댓글·방명록이 모두 삭제되며 되돌릴 수 없습니다.")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteAccount();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      // 서버에서 계정을 지워도 브라우저의 세션 쿠키는 남는다. 이미 없는 사용자라 서버에 알리지 않고 지운다.
      await createSupabaseBrowserClient().auth.signOut({ scope: "local" });
      toast.success("탈퇴했어요.");
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex h-10 items-center justify-center rounded-xl border border-red-500/40 px-4 text-sm font-bold text-red-600 transition hover:bg-red-500/10 disabled:opacity-50"
    >
      {pending ? "탈퇴 중…" : "회원 탈퇴"}
    </button>
  );
}
