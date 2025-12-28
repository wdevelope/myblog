import { getComments, getPostBySlug } from "@/lib/api";
import CommentForm from "@/app/_components/CommentForm";
import PostImages from "@/app/_components/PostImages";
import Markdown from "@/app/_components/Markdown";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge, Card, CardBody } from "@/app/_components/ui";

export const dynamic = "force-dynamic";

export default async function FeedPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug({ slug });
  if (post.type !== "feed") notFound();
  const comments = await getComments({ postId: post.id });

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <nav className="text-sm text-muted">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/feed" className="hover:text-foreground">
          Feed
        </Link>
      </nav>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <Badge variant="primary">FEED</Badge>
          <span className="h-1 w-1 rounded-full bg-muted/60" />
          <span>{new Date(post.createdAt).toLocaleString()}</span>
          <span className="h-1 w-1 rounded-full bg-muted/60" />
          <span>{post.visibility}</span>
        </div>
        <h1 className="text-4xl font-black tracking-tight md:text-5xl">
          {post.title}
        </h1>
      </header>

      <Card>
        <CardBody>
          <Markdown content={post.content} />
          <PostImages imageKeys={post.imageKeys} />
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="text-base font-bold text-foreground">Comments</h2>
          <div className="mt-4 space-y-3">
            {comments.length ? (
              comments.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm"
                >
                  <p className="whitespace-pre-wrap text-foreground">
                    {c.content}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {new Date(c.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">No comments yet.</p>
            )}
          </div>
          <CommentForm postSlug={post.slug} />
        </CardBody>
      </Card>
    </article>
  );
}
