import type { Metadata } from "next";
import PostEditor from "@/app/_components/PostEditor";
import { getCategorySlugsDirectly, loadPostForEdit } from "@/lib/server/posts";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `아티클 수정: ${slug}` };
}

export default async function ArticleEditPage({ params }: Props) {
  const { slug } = await params;
  const [post, categories] = await Promise.all([
    loadPostForEdit("blog", slug),
    getCategorySlugsDirectly(),
  ]);

  return (
    <PostEditor
      type="blog"
      categories={categories}
      initial={{
        id: post.id,
        slug: post.slug,
        title: post.title,
        content: post.content,
        visibility: post.visibility,
        updatedAt: post.updatedAt,
        categorySlug: post.categorySlug ?? null,
        imageKeys: post.imageKeys ?? [],
        thumbnailImageKey: post.thumbnailImageKey ?? null,
      }}
      deleteSlug={post.slug}
      deleteRedirectTo="/article"
    />
  );
}
