import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export default async function ArticleCategoryRedirectPage({ params }: Props) {
  const { slug } = await params;
  redirect(`/article?category=${encodeURIComponent(slug)}`);
}

