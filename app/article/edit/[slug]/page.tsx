import type { Metadata } from "next";
import PostEditor from "@/app/_components/PostEditor";
import { loadPostForEdit } from "@/lib/server/posts";

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
  const post = await loadPostForEdit("blog", slug);

  return (
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
        thumbnailImageKey: post.thumbnailImageKey ?? null,
      }}
      deleteSlug={post.slug}
      deleteRedirectTo="/article"
    />
  );
}
