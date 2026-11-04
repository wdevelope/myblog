"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import NicknameField from "@/app/_components/NicknameField";
import { notifyProfileChanged } from "@/app/_components/useMyProfile";
import { updateNickname } from "@/lib/actions/profile";
import { Button } from "@/app/_components/ui";

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
        <Button
          type="submit"
          disabled={!canSave}
        >
          닉네임 저장
        </Button>
      </div>
    </form>
  );
}
