import { getPostBySlug } from "@/lib/api";
import { getComments } from "@/lib/api";
import PostImages from "@/app/_components/PostImages";
import CommentForm from "@/app/_components/CommentForm";
import Markdown from "@/app/_components/Markdown";
import BackButton from "@/app/_components/BackButton";
import DeletePostButton from "@/app/_components/DeletePostButton";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Badge, Card, CardBody } from "@/app/_components/ui";
import { getCurrentUser, isAdminDb } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let post: Awaited<ReturnType<typeof getPostBySlug>>;
  try {
    post = await getPostBySlug({ slug });
  } catch (e) {
    const err = e as { status?: number };
    if (err.status === 401)
      redirect(`/login?from=${encodeURIComponent(`/article/${slug}`)}`);
    if (err.status === 403) redirect("/");
    throw e;
  }
  if (post.type !== "blog") notFound();
  const user = await getCurrentUser();
  const isAdmin = await isAdminDb(user);
  const comments = user ? await getComments({ postId: post.id }) : [];

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center justify-between gap-4">
        <BackButton
          fallbackHref="/article"
          className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-surface px-3 text-sm font-bold text-foreground transition hover:bg-surface-2"
        >
          ← 뒤로
        </BackButton>
        {isAdmin ? (
          <div className="flex items-center gap-2">
            <Link
              href={`/article/edit/${post.slug}`}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-surface px-3 text-sm font-bold text-foreground transition hover:bg-surface-2"
            >
              수정
            </Link>
            <DeletePostButton
              slug={post.slug}
              redirectTo="/article"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-surface px-3 text-sm font-bold text-foreground transition hover:bg-surface-2"
            >
              삭제
            </DeletePostButton>
          </div>
        ) : null}
      </div>

      <nav className="text-sm text-muted">
        <Link href="/" className="hover:text-foreground">
          홈
        </Link>
        <span className="mx-2">/</span>
        <Link href="/article" className="hover:text-foreground">
          아티클
        </Link>
        {post.categorySlug ? (
          <>
            <span className="mx-2">/</span>
            <Link
              href={`/article/category/${post.categorySlug}`}
              className="hover:text-foreground"
            >
              {post.categorySlug}
            </Link>
          </>
        ) : null}
      </nav>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <Badge variant="primary">아티클</Badge>
          {post.categorySlug ? (
            <Badge variant="default">{post.categorySlug}</Badge>
          ) : null}
          <span className="h-1 w-1 rounded-full bg-muted/60" />
          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
          <span className="h-1 w-1 rounded-full bg-muted/60" />
          <span>{post.visibility === "public" ? "공개" : "비공개"}</span>
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
          <h2 className="text-base font-bold text-foreground">댓글</h2>
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
              <p className="text-sm text-muted">
                {user ? "아직 댓글이 없습니다." : "로그인 후 댓글을 확인할 수 있어요."}
              </p>
            )}
          </div>
          {user ? (
            <CommentForm postSlug={post.slug} />
          ) : (
            <div className="mt-6">
              <Link
                href={`/login?from=${encodeURIComponent(`/article/${slug}`)}`}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110"
              >
                로그인하고 댓글 쓰기
              </Link>
            </div>
          )}
        </CardBody>
      </Card>
    </article>
  );
}
