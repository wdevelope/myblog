import { notFound, permanentRedirect } from "next/navigation";
import ArticleIndex from "@/app/article/(list)/ArticleIndex";
import { articleListHref } from "@/lib/constants";

type Props = { params: Promise<{ page: string }> };

export const metadata = {
  title: "아티클",
};

export const revalidate = 86400; // REVALIDATE_PERIOD

// 쪽 번호는 첫 방문 때 만들어 캐시한다.
export function generateStaticParams() {
  return [];
}

export default async function ArticlePagedPage({ params }: Props) {
  const { page: raw } = await params;
  const page = Number(raw);
  if (!Number.isInteger(page) || page < 1) notFound();
  if (page === 1) permanentRedirect(articleListHref());

  return <ArticleIndex page={page} />;
}
