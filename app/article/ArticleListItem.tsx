import Link from "next/link";
import Image from "next/image";
import { FiLock } from "react-icons/fi";
import type { Post } from "@/lib/types";
import { toExcerpt } from "@/lib/markdown";
import { coverKeyOf, coverSrcFromImageKey } from "@/lib/image";
import { formatPostDate } from "@/lib/utils";

function CommentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "size-4"}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

// 아티클 목록과 홈 최신 아티클이 함께 쓰는 게시판형 한 줄. 부모는 `ul.divide-y`다.
export default function ArticleListItem({
  post,
  priority = false,
}: {
  post: Post;
  priority?: boolean;
}) {
  const coverKey = coverKeyOf(post);
  const coverSrc = coverKey ? coverSrcFromImageKey(coverKey) : null;

  return (
    <li>
      <Link
        href={`/article/${post.slug}`}
        className="group flex items-center gap-4 py-5 sm:gap-6 sm:py-6"
        prefetch={false}
      >
        <article className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted">
            <span className="truncate transition-colors group-hover:text-primary">
              {post.categorySlug || "전체"}
            </span>
            {post.visibility === "private" ? (
              <span className="shrink-0 text-amber-500" aria-label="비공개">
                <FiLock className="size-3.5" />
              </span>
            ) : null}
          </div>
          <h2 className="mt-1.5 line-clamp-2 text-lg font-black leading-snug text-foreground transition group-hover:text-primary sm:text-xl">
            {post.title}
          </h2>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
            {toExcerpt(post.content)}
          </p>
          <div className="mt-3 flex items-center gap-3 text-xs text-muted">
            <time dateTime={post.createdAt} className="font-medium text-muted/60">
              {formatPostDate(post.createdAt)}
            </time>
            {(post.commentCount ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-primary/80">
                <CommentIcon className="size-3.5" />
                <span className="font-bold">{post.commentCount}</span>
              </span>
            )}
          </div>
        </article>

        {coverSrc ? (
          <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-2 sm:aspect-4/3 sm:w-40">
            <Image
              src={coverSrc}
              alt=""
              fill
              sizes="(min-width: 640px) 160px, 96px"
              className="object-cover transition duration-300 group-hover:scale-[1.03]"
              priority={priority}
            />
          </div>
        ) : null}
      </Link>
    </li>
  );
}
