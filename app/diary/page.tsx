import { getPosts } from "@/lib/api";
import { getCurrentUser, isAdminDb } from "@/lib/server/admin";
import DiaryIndexClient from "@/app/diary/DiaryIndexClient";

export const metadata = {
  title: "다이어리",
};

export const dynamic = "force-dynamic";

export default async function DiaryPage() {
  const user = await getCurrentUser();
  const isAdmin = await isAdminDb(user);
  const posts = await getPosts({ type: "diary" });
  return (
    <DiaryIndexClient posts={posts} isAdmin={isAdmin} />
  );
}
