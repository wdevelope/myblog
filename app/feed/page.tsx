import { ButtonLink, Card, CardBody } from "@/app/_components/ui";
import { FeedCard } from "./FeedCard";
import { getCurrentUser, isAdminDb } from "@/lib/server/admin";
import { getPostsDirectly } from "@/lib/server/posts";

export const metadata = {
  title: "피드",
};

export const revalidate = 60;

export default async function FeedPage() {
  const user = await getCurrentUser();
  const [isAdmin, posts] = await Promise.all([
    isAdminDb(user),
    getPostsDirectly({ type: "feed", user }),
  ]);

  return (
    <div className="mx-auto max-w-xl space-y-8">
      {isAdmin ? (
        <header className="flex justify-end mb-4">
          <ButtonLink href="/feed/write" variant="secondary">
            피드 쓰기
          </ButtonLink>
        </header>
      ) : null}

      <div className="space-y-7">
        {posts.length ? (
          posts.map((post) => (
            <FeedCard
              key={post.id}
              post={{
                ...post,
                content: post.content, // explicitly include to show we are aware
              }}
              isAdmin={isAdmin}
            />
          ))
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
