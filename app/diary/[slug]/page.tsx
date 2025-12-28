import { getPostBySlug } from "@/lib/api";
import PostImages from "@/app/_components/PostImages";
import Markdown from "@/app/_components/Markdown";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge, Card, CardBody } from "@/app/_components/ui";
import { requireAdmin } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function DiaryEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdmin("/diary");
  const { slug } = await params;
  const post = await getPostBySlug({ slug });
  if (post.type !== "diary") notFound();

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <nav className="text-sm text-muted">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/diary" className="hover:text-foreground">
          Diary
        </Link>
      </nav>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <Badge variant="warning">DIARY</Badge>
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
    </article>
  );
}
