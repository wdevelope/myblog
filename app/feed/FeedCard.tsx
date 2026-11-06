"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { Bookmark, FileText, Heart } from "lucide-react";
import { cn, formatPostDate } from "@/lib/utils";
import type { Post } from "@/lib/types";
import { Card, CardBody } from "@/app/_components/ui";
import PostActionMenu from "@/app/_components/PostActionMenu";
import { coverSrcFromImageKey, isImageProxySrc } from "@/lib/image";

// 요약과 본문은 서버에서 만들어 넘긴다. 클라이언트 컴포넌트가 렌더러를 import하면 공개 피드 번들에 markdown-it·KaTeX가 실린다.
export function FeedCard({
  post,
  isAdmin,
  imageKeys,
  excerpt,
  hasMore,
  body,
}: {
  post: Post;
  isAdmin: boolean;
  imageKeys: string[];
  excerpt: string;
  hasMore: boolean;
  body: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);

  const handleSave = () => {
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    if (nextSaved) setShowSaveToast(true);
  };

  return (
    <Card className="relative overflow-hidden transition hover:shadow-lg">
      {/* Instagram-style header with avatar */}
      <div className="flex items-center gap-3 border-b border-border p-4">
        <Image
          src="/logo.png"
          alt=""
          width={40}
          height={40}
          className="size-10 rounded-full object-cover ring-1 ring-border"
          priority={false}
        />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">오웬</p>
          <p className="text-xs text-muted" suppressHydrationWarning>
            {formatPostDate(post.createdAt)}
          </p>
        </div>
        {isAdmin ? (
          <PostActionMenu
            editHref={`/feed/edit/${post.slug}`}
            deleteSlug={post.slug}
            deleteRedirectTo="/feed"
          />
        ) : null}
      </div>

      {/* Image area */}
      {imageKeys.length ? (
        <div className="grid grid-cols-2 gap-0.5">
          {imageKeys.map((key, index) => {
            // 홀수 장이면 첫 장을 넓게 둬 마지막 줄에 빈 칸이 남지 않는다. 한 장이면 정사각 표지 그대로다.
            const wide = index === 0 && imageKeys.length % 2 === 1;
            const src = coverSrcFromImageKey(key);
            return (
              <div
                key={key}
                className={cn("relative aspect-square bg-surface-2", wide && "col-span-2")}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes={wide ? "(min-width: 768px) 600px, 100vw" : "(min-width: 768px) 300px, 50vw"}
                  className="object-cover"
                  unoptimized={isImageProxySrc(src)}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="aspect-square w-full bg-linear-to-br from-surface-2 via-surface to-surface-2 flex items-center justify-center">
          <div className="text-center space-y-2 p-8">
            <div className="mx-auto size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FileText className="size-8 text-primary" aria-hidden />
            </div>
          </div>
        </div>
      )}

      {/* Interaction Icons and Content area */}
      <CardBody className="pt-3 pb-5 px-4 space-y-3">
        {/* Row 1: Action Icons */}
        <div className="flex items-center justify-between -mx-1 text-foreground">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsLiked(!isLiked)}
              aria-label="좋아요"
              aria-pressed={isLiked}
              className="p-1 hover:opacity-60 transition active:scale-80"
            >
              <Heart
                className={cn(
                  "size-6 transition-colors",
                  isLiked ? "fill-red-500 text-red-500" : ""
                )}
              />
            </button>
          </div>
          <div className="relative">
            {showSaveToast && (
              <div
                onAnimationEnd={() => setShowSaveToast(false)}
                className="feed-save-toast absolute right-0 top-0 whitespace-nowrap text-[11px] font-black text-primary pointer-events-none drop-shadow-sm bg-surface/80 px-2 py-1 rounded-full border border-primary/20"
              >
                내 마음속에 저장 ✨
              </div>
            )}
            <button
              type="button"
              onClick={handleSave}
              aria-label="저장"
              aria-pressed={isSaved}
              className="p-1 hover:opacity-60 transition active:scale-80"
            >
              <Bookmark
                className={cn(
                  "size-6 transition-colors",
                  isSaved ? "fill-current" : ""
                )}
              />
            </button>
          </div>
        </div>

        {(post.commentCount ?? 0) > 0 && (
          <p className="mt-1 text-[14px] font-bold text-foreground">
            댓글 {post.commentCount}개
          </p>
        )}

        {/* Row 3: Caption */}
        <div className="flex flex-col gap-1">
          {expanded ? (
            <div className="space-y-3">
              <div className="text-[14px] leading-normal text-foreground font-normal">
                <span className="font-bold mr-2 text-foreground">오웬</span>
                {body}
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="text-[14px] font-medium text-muted hover:text-foreground transition leading-normal"
              >
                접기
              </button>
            </div>
          ) : (
            <div className="relative group/content">
              <p
                className={cn(
                  "wrap-break-word text-[14px] leading-normal text-foreground font-normal",
                  hasMore && "line-clamp-2"
                )}
              >
                <span className="font-bold mr-2 text-foreground border-none bg-transparent p-0">
                  오웬
                </span>
                {excerpt}
              </p>
              {hasMore ? (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="mt-1 text-[14px] font-medium text-muted hover:text-foreground transition"
                >
                  더 보기
                </button>
              ) : null}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
