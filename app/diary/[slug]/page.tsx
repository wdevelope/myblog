import { getPostBySlug } from "@/lib/api";
import PostImages from "@/app/_components/PostImages";
import Markdown from "@/app/_components/Markdown";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DiaryEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug({ slug });
  if (post.type !== "diary") notFound();

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Diary · {post.visibility}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{post.title}</h1>
      </header>

      <Markdown content={post.content} />

      <PostImages imageKeys={post.imageKeys} />
    </article>
  );
}
