import type { Metadata } from "next";
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
  return { title: `다이어리 수정: ${slug}` };
}

export default async function DiaryEditPage({ params }: Props) {
  await requireAdmin("/diary");
  const { slug } = await params;
  const post = await getPostBySlug({ slug });
  if (post.type !== "diary") notFound();

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
        imageKeys: post.imageKeys ?? [],
      }}
      deleteSlug={post.slug}
      deleteRedirectTo="/diary"
    />
  );
}
