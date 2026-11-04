import { CircleAlert } from "lucide-react";
import { ButtonLink, Card, CardBody } from "@/app/_components/ui";
import MarkdownContent from "@/app/_components/MarkdownContent";
import { FeedCard } from "@/app/feed/FeedCard";
import { toExcerpt } from "@/lib/markdown";
import { getPreviewViewer } from "@/lib/server/admin";
import { getPublicPosts } from "@/lib/server/publicPosts";

export const metadata = {
  title: "피드",
};

export const revalidate = 86400; // REVALIDATE_PERIOD

export default async function FeedPage() {
  // 피드는 항상 공개라 관리자도 같은 공개 조회를 쓴다. 관리자 버튼만 draft mode에서 보인다.
  const { isAdmin } = await getPreviewViewer();
  const { data: posts } = await getPublicPosts({ type: "feed" });

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
              post={post}
              isAdmin={isAdmin}
              excerpt={toExcerpt(post.content, 1000)}
              body={<MarkdownContent content={post.content} compact />}
            />
          ))
        ) : (
          <Card>
            <CardBody className="text-center py-12">
              <div className="mx-auto size-16 rounded-full bg-surface-2 flex items-center justify-center mb-4">
                <CircleAlert className="size-8 text-muted" aria-hidden />
              </div>
              <p className="text-sm text-muted">아직 피드가 없습니다.</p>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
