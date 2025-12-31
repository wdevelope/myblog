import type { Metadata } from "next";
import Link from "next/link";
import { getPublicPosts } from "@/lib/server/publicPosts";
import { Badge, Card, CardBody } from "@/app/_components/ui";
import MarkdownExcerpt from "@/app/_components/MarkdownExcerpt";
import { toExcerptMarkdown } from "@/lib/markdown";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `카테고리: ${slug}` };
}

export const revalidate = 60;

export default async function BlogCategoryPage({ params }: Props) {
  const { slug } = await params;
  const posts = await getPublicPosts({ type: "blog", category: slug });
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm text-muted">
          <Link href="/article" className="hover:text-foreground">
            아티클
          </Link>{" "}
          <span className="mx-2 text-muted/70">/</span> 카테고리
        </p>
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">
          {slug}
        </h1>
        <p className="text-sm text-muted">{posts.length}개의 글</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {posts.length ? (
          posts.map((post) => (
            <Card
              key={post.id}
              className="group overflow-hidden transition hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
            >
              <Link href={`/article/${post.slug}`} className="block">
                <div className="relative aspect-video w-full overflow-hidden bg-surface-2">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent opacity-60 transition group-hover:opacity-40" />
                  <div className="absolute left-4 top-4">
                    <Badge variant="primary">{slug.toUpperCase()}</Badge>
                  </div>
                </div>
                <CardBody className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    <span className="h-1 w-1 rounded-full bg-muted/60" />
                    <span>{post.visibility === "public" ? "공개" : "비공개"}</span>
                  </div>
                  <h3 className="text-lg font-bold leading-tight text-foreground transition group-hover:text-primary">
                    {post.title}
                  </h3>
                  <MarkdownExcerpt content={toExcerptMarkdown(post.content)} />
                </CardBody>
              </Link>
            </Card>
          ))
        ) : (
          <Card className="md:col-span-2">
            <CardBody>
              <p className="text-sm text-muted">이 카테고리에 글이 없습니다.</p>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
