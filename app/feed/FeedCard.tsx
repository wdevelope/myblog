"use client";

import { useState } from "react";
import Image from "next/image";
import { FiHeart, FiMessageCircle, FiBookmark } from "react-icons/fi";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Post } from "@/lib/types";
import { Card, CardBody } from "@/app/_components/ui";
import PostActionMenu from "@/app/_components/PostActionMenu";
import { coverSrcFromImageKey } from "@/lib/image";
import HtmlContent from "@/app/_components/HtmlContent";
import { toExcerpt } from "@/lib/markdown";

export function FeedCard({ post, isAdmin }: { post: Post; isAdmin: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isCommented, setIsCommented] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);

  const handleSave = () => {
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    if (nextSaved) {
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 1200);
    }
  };

  const coverKey = post.imageKeys?.[0];
  const coverSrc = coverKey ? coverSrcFromImageKey(coverKey) : null;
  const textContent = toExcerpt(post.content, 1000);
  const shouldShowMore = textContent.length > 140;

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
          <p className="text-sm font-semibold text-foreground">원스</p>
          <p className="text-xs text-muted" suppressHydrationWarning>
            {new Date(post.createdAt).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
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
        <div className="aspect-square w-full bg-gradient-to-br from-surface-2 via-surface to-surface-2 flex items-center justify-center">
          <div className="text-center space-y-2 p-8">
            <div className="mx-auto size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <svg
                className="size-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-.75a.75.75 0 01-.75-.75v-.75a3.375 3.375 0 00-3.375-3.375H9.75a3.375 3.375 0 00-3.375 3.375v11.25A3.375 3.375 0 009.75 21h4.5a3.375 3.375 0 003.375-3.375v-.375"
                />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Interaction Icons and Content area */}
      <CardBody className="pt-3 pb-5 px-4 space-y-3">
        {/* Row 1: Action Icons */}
        <div className="flex items-center justify-between -mx-1 text-[#262626]">
          <div className="flex items-center gap-4">
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={() => setIsLiked(!isLiked)}
              className="p-1 hover:opacity-60 transition outline-none"
            >
              <FiHeart
                className={cn(
                  "size-6 transition-colors",
                  isLiked ? "fill-red-500 text-red-500" : ""
                )}
              />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={() => setIsCommented(!isCommented)}
              className="p-1 hover:opacity-60 transition outline-none"
            >
              <FiMessageCircle
                className={cn(
                  "size-6 transition-colors",
                  isCommented ? "fill-[#0095f6] text-[#0095f6]" : ""
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
                  className="absolute right-0 top-0 whitespace-nowrap text-[11px] font-black text-primary pointer-events-none drop-shadow-sm bg-white/80 px-2 py-1 rounded-full border border-primary/20"
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
              <FiBookmark
                className={cn(
                  "size-6 transition-colors",
                  isSaved ? "fill-current" : ""
                )}
              />
            </motion.button>
          </div>
        </div>

        {/* Row 2: Likes (Dummy count adjustment) */}
        <div className="mt-1">
          <p className="text-[14px] font-bold text-[#262626]">
            좋아요 {isLiked ? 8 : 7}개
          </p>
        </div>

        {/* Row 3: Caption */}
        <div className="flex flex-col gap-1">
          {expanded ? (
            <div className="space-y-3">
              <div className="text-[14px] leading-[1.5] text-[#262626] font-normal">
                <span className="font-bold mr-2 text-black">원스</span>
                <HtmlContent content={post.content} isFeed />
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="text-[14px] font-medium text-muted hover:text-foreground transition"
              >
                접기
              </button>
            </div>
          ) : (
            <div className="relative group/content">
              <p className="line-clamp-2 text-[14px] leading-[1.5] text-[#262626] font-normal">
                <span className="font-bold mr-2 text-black border-none bg-transparent p-0">
                  원스
                </span>
                {textContent}
              </p>
              {shouldShowMore ? (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="mt-1 text-[14px] font-medium text-muted hover:text-gray-500 transition"
                >
                  더 보기
                </button>
              ) : null}
            </div>
          )}
        </div>

        {/* Row 4: Dummy Comment Animation */}
        <AnimatePresence>
          {isCommented && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="overflow-hidden pt-1"
            >
              <div className="text-[14px] leading-[1.5] text-[#262626]">
                <span className="font-bold mr-2 text-black">방문객</span>
                피드가 좋네요 😊
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardBody>
    </Card>
  );
}
