import type { Metadata } from "next";
import PostEditor from "@/app/_components/PostEditor";
import { requireAdmin } from "@/lib/server/admin";

export const metadata: Metadata = {
  title: "피드 쓰기",
};

export const dynamic = "force-dynamic";

export default async function FeedWritePage() {
  await requireAdmin("/feed/write");

  return <PostEditor type="feed" />;
}
