import type { Metadata } from "next";
import Link from "next/link";
import BackButton from "@/app/_components/BackButton";
import PostActionMenu from "@/app/_components/PostActionMenu";
import PostEditor from "@/app/_components/PostEditor";
import { getPostBySlug } from "@/lib/api";
import { requireAdmin } from "@/lib/server/admin";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `아티클 수정: ${slug}` };
}

export default async function ArticleEditPage({ params }: Props) {
  await requireAdmin("/article");
  const { slug } = await params;
  const post = await getPostBySlug({ slug });
  if (post.type !== "blog") notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm text-muted">
          <BackButton
            fallbackHref="/article"
            className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-surface px-3 text-sm font-bold text-foreground transition hover:bg-surface-2"
          >
            ← 뒤로
          </BackButton>
          <nav className="hidden items-center gap-2 sm:flex">
            <Link href="/article" className="hover:text-foreground">
              아티클
            </Link>
            <span className="text-muted/70">/</span>
            <span className="text-foreground">수정</span>
          </nav>
        </div>

        <PostActionMenu
          deleteSlug={post.slug}
          deleteRedirectTo="/article"
          ariaLabel="삭제 메뉴"
        />
      </div>

      <PostEditor
        type="blog"
        initial={{
          id: post.id,
          slug: post.slug,
          title: post.title,
          content: post.content,
          visibility: post.visibility,
          categorySlug: post.categorySlug ?? null,
          imageKeys: post.imageKeys ?? [],
        }}
      />
    </div>
  );
}
