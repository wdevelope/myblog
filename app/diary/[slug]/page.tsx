import { getPostBySlug } from "@/lib/api";
import PostImages from "@/app/_components/PostImages";

export const dynamic = "force-dynamic";

export default async function DiaryEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug({ slug });

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Diary · {post.visibility}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{post.title}</h1>
      </header>

      <div className="prose prose-zinc max-w-none dark:prose-invert">
        <p className="whitespace-pre-wrap">{post.content}</p>
      </div>

      <PostImages imageKeys={post.imageKeys} />
    </article>
  );
}

