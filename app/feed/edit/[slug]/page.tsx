import type { Metadata } from "next";
import PostEditor from "@/app/_components/PostEditor";
import { loadPostForEdit } from "@/lib/server/posts";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `피드 수정: ${slug}` };
}

export default async function FeedEditPage({ params }: Props) {
  const { slug } = await params;
  const post = await loadPostForEdit("feed", slug);

  return (
    <PostEditor
      type="feed"
      initial={{
        id: post.id,
        slug: post.slug,
        title: post.title,
        content: post.content,
        visibility: post.visibility,
        imageKeys: post.imageKeys ?? [],
      }}
      deleteSlug={post.slug}
      deleteRedirectTo="/feed"
    />
  );
}
