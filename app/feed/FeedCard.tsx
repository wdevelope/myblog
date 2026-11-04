"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { Bookmark, FileText, Heart } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn, formatPostDate } from "@/lib/utils";
import type { Post } from "@/lib/types";
import { Card, CardBody } from "@/app/_components/ui";
import PostActionMenu from "@/app/_components/PostActionMenu";
import { coverKeyOf, coverSrcFromImageKey } from "@/lib/image";

// 요약과 본문은 서버에서 만들어 넘긴다. 클라이언트 컴포넌트가 렌더러를 import하면 공개 피드 번들에 markdown-it·KaTeX가 실린다.
export function FeedCard({
  post,
  isAdmin,
  excerpt,
  body,
}: {
  post: Post;
  isAdmin: boolean;
  excerpt: string;
  body: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);

  const handleSave = () => {
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    if (nextSaved) {
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 1200);
    }
  };

  const coverKey = coverKeyOf(post);
  const coverSrc = coverKey ? coverSrcFromImageKey(coverKey) : null;
  const shouldShowMore = excerpt.length > 140;

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
      {coverSrc ? (
        <div className="relative aspect-square w-full bg-surface-2">
          <Image
            src={coverSrc}
            alt=""
            fill
            sizes="(min-width: 768px) 600px, 100vw"
            className="object-cover"
          />
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
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={() => setIsLiked(!isLiked)}
              className="p-1 hover:opacity-60 transition outline-none"
            >
              <Heart
                className={cn(
                  "size-6 transition-colors",
                  isLiked ? "fill-red-500 text-red-500" : ""
                )}
              />
            </motion.button>
          </div>
          <div className="relative">
            <AnimatePresence>
              {showSaveToast && (
                <motion.div
                  initial={{ opacity: 0, y: 0, scale: 0.8 }}
                  animate={{ opacity: 1, y: -45, scale: 1 }}
                  exit={{ opacity: 0, y: -60, scale: 1.1 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="absolute right-0 top-0 whitespace-nowrap text-[11px] font-black text-primary pointer-events-none drop-shadow-sm bg-surface/80 px-2 py-1 rounded-full border border-primary/20"
                >
                  내 마음속에 저장 ✨
                </motion.div>
              )}
            </AnimatePresence>
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={handleSave}
              className="p-1 hover:opacity-60 transition outline-none"
            >
              <Bookmark
                className={cn(
                  "size-6 transition-colors",
                  isSaved ? "fill-current" : ""
                )}
              />
            </motion.button>
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
              <p className="line-clamp-2 text-[14px] leading-normal text-foreground font-normal">
                <span className="font-bold mr-2 text-foreground border-none bg-transparent p-0">
                  오웬
                </span>
                {excerpt}
              </p>
              {shouldShowMore ? (
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
