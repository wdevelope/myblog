import { getPostBySlug } from "@/lib/api";
import { getComments } from "@/lib/api";
import PostImages from "@/app/_components/PostImages";
import CommentForm from "@/app/_components/CommentForm";
import Markdown from "@/app/_components/Markdown";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug({ slug });
  if (post.type !== "blog") notFound();
  const comments = await getComments({ postId: post.id });

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Blog · {post.categorySlug} · {post.visibility}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{post.title}</h1>
      </header>

      <Markdown content={post.content} />

      <PostImages imageKeys={post.imageKeys} />

      <section className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <h2 className="font-semibold">Comments</h2>
        <div className="mt-3 space-y-3">
          {comments.length ? (
            comments.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-black/5 bg-zinc-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-black"
              >
                <p className="whitespace-pre-wrap">{c.content}</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(c.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No comments yet.
            </p>
          )}
        </div>
        <CommentForm postSlug={post.slug} />
      </section>
    </article>
  );
}
