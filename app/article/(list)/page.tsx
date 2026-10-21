import ArticleIndex from "@/app/article/(list)/ArticleIndex";

export const metadata = {
  title: "아티클",
};

export const revalidate = 86400; // REVALIDATE_PERIOD

export default function ArticleIndexPage() {
  return <ArticleIndex page={1} />;
}
