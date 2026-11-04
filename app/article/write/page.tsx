import type { Metadata } from "next";
import PostEditor from "@/app/_components/PostEditor";
import { requireAdmin } from "@/lib/server/admin";
import { getCategorySlugsDirectly } from "@/lib/server/posts";

export const metadata: Metadata = {
  title: "아티클 쓰기",
};

export const dynamic = "force-dynamic";

export default async function ArticleWritePage() {
  await requireAdmin("/article/write");
  const categories = await getCategorySlugsDirectly();

  return <PostEditor type="blog" categories={categories} />;
}
