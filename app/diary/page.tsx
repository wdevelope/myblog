import { getPosts } from "@/lib/api";
import { requireAdmin } from "@/lib/server/admin";
import DiaryIndexClient from "@/app/diary/DiaryIndexClient";

export const metadata = {
  title: "일기",
};

export const dynamic = "force-dynamic";

export default async function DiaryPage() {
  await requireAdmin("/diary");
  const posts = await getPosts({ type: "diary" });
  return (
    <DiaryIndexClient posts={posts} />
  );
}
