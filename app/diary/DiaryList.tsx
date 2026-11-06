import Link from "next/link";
import PostActionMenu from "@/app/_components/PostActionMenu";
import VisibilityIcon from "@/app/_components/VisibilityIcon";
import { Button, ButtonLink } from "@/app/_components/ui";
import { DAY_NAMES, kstDate } from "@/lib/diaryCalendar";

const ITEMS_PER_PAGE = 10;

export type DiaryPost = {
  id: string;
  slug: string;
  title: string;
  createdAt: string;
  visibility: "public" | "private";
};

export default function DiaryList({
  posts,
  page,
  onPageChange,
  selectedYmd,
  isAdmin,
  writeHref,
}: {
  posts: DiaryPost[];
  page: number;
  onPageChange: (page: number) => void;
  selectedYmd: string | null;
  isAdmin: boolean;
  writeHref: string;
}) {
  const totalPages = Math.ceil(posts.length / ITEMS_PER_PAGE);
  const paginatedPosts = posts.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <>
      <div className="rounded-3xl border border-border bg-background shadow-sm">
        <div className="divide-y divide-border">
          {paginatedPosts.length ? (
            paginatedPosts.map((post) => {
              const date = kstDate(post.createdAt);

              return (
                <div
                  key={post.id}
                  className="px-5 py-6 transition hover:bg-surface-2/60 first:rounded-t-3xl last:rounded-b-3xl"
                >
                  <div className="flex items-start gap-5">
                    {/* Prominent Date Display */}
                    <div className="flex flex-col items-center justify-center min-w-14 transition-colors group-hover:text-primary">
                      <span className="text-xs font-semibold text-muted">
                        {date.month}월
                      </span>
                      <span className="text-2xl font-black text-foreground/80">
                        {date.day}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1 space-y-2 py-0.5">
                      <div className="flex items-start justify-between gap-3">
                        {post.visibility === "public" || isAdmin ? (
                          <Link
                            href={`/diary/${post.slug}`}
                            className="block min-w-0 flex-1"
                            prefetch={false}
                          >
                            <h2 className="truncate text-lg font-bold text-foreground transition hover:text-primary">
                              {post.title}
                            </h2>
                          </Link>
                        ) : (
                          <h2 className="truncate text-lg font-bold text-foreground/80">
                            {post.title}
                          </h2>
                        )}
                        <div className="flex items-center gap-2">
                          {post.visibility === "private" && (
                            <VisibilityIcon visibility="private" className="size-3.5" />
                          )}
                          {isAdmin ? (
                            <PostActionMenu
                              editHref={`/diary/edit/${post.slug}`}
                              deleteSlug={post.slug}
                              deleteRedirectTo="/diary"
                              ariaLabel="다이어리 더보기"
                            />
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
                        <p className="text-sm text-muted">
                          {date.year}년 {date.month}월 {date.day}일 ({DAY_NAMES[date.weekday]})
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-16 text-center">
              <p className="text-sm text-muted">
                {selectedYmd
                  ? "선택한 날짜에 작성한 다이어리가 없습니다."
                  : "아직 다이어리가 없습니다."}
              </p>
              {isAdmin ? (
                <div className="mt-4">
                  <ButtonLink
                    href={writeHref}
                  >
                    {selectedYmd
                      ? "선택한 날짜에 다이어리 작성하기"
                      : "오늘 다이어리 작성하기"}
                  </ButtonLink>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          <Button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            variant="secondary" size="sm" className="px-4 font-medium disabled:pointer-events-none"
          >
            이전
          </Button>
          <span className="flex items-center px-4 text-sm font-medium text-muted">
            {page} / {totalPages}
          </span>
          <Button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            variant="secondary" size="sm" className="px-4 font-medium disabled:pointer-events-none"
          >
            다음
          </Button>
        </div>
      )}
    </>
  );
}
