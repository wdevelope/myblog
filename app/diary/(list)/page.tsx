import { getViewer } from "@/lib/server/admin";
import { getPostsDirectly } from "@/lib/server/posts";
import DiaryIndexClient from "@/app/diary/DiaryIndexClient";

export const metadata = {
  title: "다이어리",
};

export const revalidate = 86400; // REVALIDATE_PERIOD

export default async function DiaryPage() {
  const { isAdmin } = await getViewer();
  const posts = await getPostsDirectly({ type: "diary" });

  return (
    <DiaryIndexClient posts={posts} isAdmin={isAdmin} />
  );
}
