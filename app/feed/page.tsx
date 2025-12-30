import { getPublicPosts } from "@/lib/server/publicPosts";
import { ButtonLink, Card, CardBody } from "@/app/_components/ui";
import { FeedCard } from "./FeedCard";
import { getCurrentUser, isAdminDb } from "@/lib/server/admin";

export const metadata = {
  title: "피드",
};

export const revalidate = 60;

export default async function FeedPage() {
  const posts = await getPublicPosts({ type: "feed" });

  const user = await getCurrentUser();
  const isAdmin = await isAdminDb(user);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">피드</h1>
            <p className="text-sm text-muted">
              짧은 생각과 기록을 모아둔 타임라인.
            </p>
          </div>
          {isAdmin ? (
            <ButtonLink href="/feed/write" variant="secondary">
              피드 쓰기
            </ButtonLink>
          ) : null}
        </div>
      </header>

      <div className="space-y-6">
        {posts.length ? (
          posts.map((post) => <FeedCard key={post.id} post={post} />)
        ) : (
          <Card>
            <CardBody className="text-center py-12">
              <div className="mx-auto size-16 rounded-full bg-surface-2 flex items-center justify-center mb-4">
                <svg
                  className="size-8 text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
              </div>
              <p className="text-sm text-muted">아직 피드가 없습니다.</p>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
