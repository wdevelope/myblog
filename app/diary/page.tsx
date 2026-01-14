import { getCurrentUser, isAdminDb } from "@/lib/server/admin";
import { getPostsDirectly } from "@/lib/server/posts";
import DiaryIndexClient from "@/app/diary/DiaryIndexClient";

export const metadata = {
  title: "다이어리",
};

export const revalidate = 86400; // REVALIDATE_PERIOD

export default async function DiaryPage() {
  const user = await getCurrentUser();
  const [isAdmin, posts] = await Promise.all([
    isAdminDb(user),
    getPostsDirectly({ type: "diary", user }),
  ]);

  return (
    <DiaryIndexClient posts={posts} isAdmin={isAdmin} />
  );
}
