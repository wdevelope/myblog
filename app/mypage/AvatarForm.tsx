"use client";

import { useRef, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { notifyProfileChanged } from "@/app/_components/useMyProfile";
import { toAvatarJpeg } from "@/app/mypage/toAvatarJpeg";
import { removeAvatar, updateAvatar } from "@/lib/actions/profile";
import { ACTION_FAILED } from "@/lib/constants";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AVATAR_BUCKET } from "@/lib/avatar";
import { buttonClass } from "@/app/_components/ui";

const buttonClassName = buttonClass({ variant: "secondary" });

// 사진은 브라우저가 본인 폴더에 새 이름으로 직접 올리고(Storage 정책), 서버 액션은 그 경로를 확인해 저장한 뒤 이전 파일을 지운다.
export default function AvatarForm({ userId, hasAvatar }: { userId: string; hasAvatar: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function finish(message: string) {
    toast.success(message);
    notifyProfileChanged();
    router.refresh();
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // 같은 파일을 다시 골라도 change가 나도록 비운다.
    e.target.value = "";
    if (!file) return;

    startTransition(async () => {
      let jpeg: Blob;
      try {
        jpeg = await toAvatarJpeg(file);
      } catch {
        toast.error("이 사진은 읽을 수 없어요. JPG나 PNG로 다시 골라 주세요.");
        return;
      }

      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const { error } = await createSupabaseBrowserClient()
        .storage.from(AVATAR_BUCKET)
        .upload(path, jpeg, { contentType: "image/jpeg" });
      if (error) {
        toast.error("사진을 올리지 못했어요. 다시 시도해 주세요.");
        return;
      }

      const result = await updateAvatar(path).catch(() => ACTION_FAILED);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      finish("프로필 사진을 바꿨어요.");
    });
  }

  function onRemove() {
    if (!confirm("프로필 사진을 지울까요?")) return;
    startTransition(async () => {
      const result = await removeAvatar().catch(() => ACTION_FAILED);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      finish("프로필 사진을 지웠어요.");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-foreground">프로필 사진</span>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className={buttonClassName}
        >
          {pending ? "처리 중…" : "사진 바꾸기"}
        </button>
        {hasAvatar ? (
          <button type="button" onClick={onRemove} disabled={pending} className={buttonClassName}>
            사진 지우기
          </button>
        ) : null}
      </div>
      <p className="text-xs text-muted">가운데를 정사각형으로 잘라 올려요.</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label="프로필 사진 파일"
        className="hidden"
        onChange={onFile}
      />
    </div>
  );
}
