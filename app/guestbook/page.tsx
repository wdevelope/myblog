import type { Metadata } from "next";
import GuestbookThread from "@/app/guestbook/GuestbookThread";
import { getPreviewViewer } from "@/lib/server/admin";
import { getGuestbookDirectly, getPublicGuestbook } from "@/lib/server/guestbook";

export const metadata: Metadata = {
  title: "방명록",
};

export const revalidate = 86400; // REVALIDATE_PERIOD

export default async function GuestbookPage() {
  // 관리자는 draft mode의 동적 렌더에서만 비밀글 내용까지 받는다. 방문자 정적 목록에는 비밀글 내용이 없고,
  // 작성자 본인 것은 GuestbookThread가 브라우저 세션으로 채운다.
  const { isAdmin } = await getPreviewViewer();
  const entries = isAdmin ? await getGuestbookDirectly() : await getPublicGuestbook();

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-2 sm:py-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-foreground">방명록</h1>
        <p className="text-sm text-muted">다녀간 흔적을 남겨 주세요.</p>
      </header>
      <GuestbookThread entries={entries} isAdmin={isAdmin} />
    </div>
  );
}
