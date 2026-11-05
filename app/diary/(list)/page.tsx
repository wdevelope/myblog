import { Suspense } from "react";
import { getPreviewViewer } from "@/lib/server/admin";
import { getDiaryIndexDirectly } from "@/lib/server/posts";
import { getPublicDiaryIndex } from "@/lib/server/publicPosts";
import DiaryIndexClient from "@/app/diary/DiaryIndexClient";
import DiaryListSkeleton from "@/app/diary/DiaryListSkeleton";

export const metadata = {
  title: "다이어리",
};

export const revalidate = 86400; // REVALIDATE_PERIOD

export default async function DiaryPage() {
  // 관리자는 draft mode에서 비공개 제목까지 본다. 방문자 목록은 본문 없이 제목만 담은 캐시다.
  const { isAdmin } = await getPreviewViewer();
  const posts = isAdmin ? await getDiaryIndexDirectly() : await getPublicDiaryIndex();

  // 관리자 화면은 동적이라 경계가 필요 없다. 두면 화면 전환 중 대체 표시가 뜰 때 내용이 최소 300ms 밀린다.
  if (isAdmin) return <DiaryIndexClient posts={posts} isAdmin />;

  // DiaryIndexClient가 useSearchParams를 읽어, 정적 렌더링에서는 Suspense 경계가 있어야 한다.
  return (
    <Suspense fallback={<DiaryListSkeleton />}>
      <DiaryIndexClient posts={posts} isAdmin={false} />
    </Suspense>
  );
}
