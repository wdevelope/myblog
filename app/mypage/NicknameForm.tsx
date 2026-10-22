"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import NicknameField from "@/app/_components/NicknameField";
import { notifyProfileChanged } from "@/app/_components/useMyProfile";
import { updateNickname } from "@/lib/actions/profile";

export default function NicknameForm({ current }: { current: string | null }) {
  const router = useRouter();
  const [nickname, setNickname] = useState(current ?? "");
  const [verified, setVerified] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const trimmed = nickname.trim();
  const canSave = verified === trimmed && trimmed !== current && !pending;

  function save(e: FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    startTransition(async () => {
      const result = await updateNickname(trimmed);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("닉네임을 바꿨어요.");
      notifyProfileChanged();
      router.refresh();
    });
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <NicknameField id="mypage-nickname" value={nickname} onChange={setNickname} onVerified={setVerified} />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!canSave}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110 disabled:opacity-50"
        >
          닉네임 저장
        </button>
      </div>
    </form>
  );
}
