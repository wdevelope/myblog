import Link from "next/link";
import Image from "next/image";
import { MessageCircleMore } from "lucide-react";
import VisibilityIcon from "@/app/_components/VisibilityIcon";
import type { Post } from "@/lib/types";
import { toExcerpt } from "@/lib/markdown";
import { coverKeyOf, coverSrcFromImageKey, isImageProxySrc } from "@/lib/image";
import { formatPostDate } from "@/lib/utils";

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
              <VisibilityIcon visibility="private" className="size-3.5 shrink-0" />
            ) : null}
          </div>
          <h2 className="mt-1.5 line-clamp-2 text-lg font-black leading-snug text-foreground transition group-hover:text-primary sm:text-xl">
            {post.title}
          </h2>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
            {toExcerpt(post.content)}
          </p>
          <div className="mt-3 flex items-center gap-3 text-xs text-muted">
            <time dateTime={post.createdAt} className="font-medium text-muted">
              {formatPostDate(post.createdAt)}
            </time>
            {(post.commentCount ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-primary/80">
                <MessageCircleMore className="size-3.5" aria-hidden />
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
              unoptimized={isImageProxySrc(coverSrc)}
            />
          </div>
        ) : null}
      </Link>
    </li>
  );
}
