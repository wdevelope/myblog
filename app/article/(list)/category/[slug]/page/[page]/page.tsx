import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import ArticleIndex from "@/app/article/(list)/ArticleIndex";
import { articleListHref } from "@/lib/constants";

type Props = { params: Promise<{ slug: string; page: string }> };

export const revalidate = 86400; // REVALIDATE_PERIOD

// 쪽 번호는 첫 방문 때 만들어 캐시한다.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${decodeURIComponent(slug)} | 아티클` };
}

export default async function ArticleCategoryPagedPage({ params }: Props) {
  const { slug, page: raw } = await params;
  const category = decodeURIComponent(slug);
  const page = Number(raw);
  if (!Number.isInteger(page) || page < 1) notFound();
  if (page === 1) permanentRedirect(articleListHref(category));

  return <ArticleIndex category={category} page={page} />;
}
