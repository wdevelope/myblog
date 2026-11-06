import type { Metadata } from "next";
import PostEditor from "@/app/_components/PostEditor";
import { loadPostForEdit } from "@/lib/server/posts";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `다이어리 수정: ${slug}` };
}

export default async function DiaryEditPage({ params }: Props) {
  const { slug } = await params;
  const post = await loadPostForEdit("diary", slug);

  return (
    <PostEditor
      type="diary"
      defaultVisibility="private"
      initial={{
        id: post.id,
        slug: post.slug,
        title: post.title,
        content: post.content,
        visibility: post.visibility,
        updatedAt: post.updatedAt,
        imageKeys: post.imageKeys ?? [],
      }}
      deleteSlug={post.slug}
      deleteRedirectTo="/diary"
    />
  );
}
