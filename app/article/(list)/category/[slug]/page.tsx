import type { Metadata } from "next";
import ArticleIndex from "@/app/article/(list)/ArticleIndex";
import { getPublicCategories } from "@/lib/server/publicPosts";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 86400; // REVALIDATE_PERIOD

export async function generateStaticParams() {
  const categories = await getPublicCategories();
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${decodeURIComponent(slug)} | 아티클` };
}

export default async function ArticleCategoryPage({ params }: Props) {
  const { slug } = await params;
  return <ArticleIndex category={decodeURIComponent(slug)} page={1} />;
}
