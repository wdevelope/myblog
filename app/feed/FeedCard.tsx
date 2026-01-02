"use client";

import { useState } from "react";
import Image from "next/image";
import type { Post } from "@/lib/types";
import { Card, CardBody } from "@/app/_components/ui";
import PostActionMenu from "@/app/_components/PostActionMenu";

import { coverSrcFromImageKey } from "@/lib/image";

export function FeedCard({ post, isAdmin }: { post: Post; isAdmin: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const coverKey = post.imageKeys?.[0];
  const coverSrc = coverKey ? coverSrcFromImageKey(coverKey) : null;
  const shouldShowMore = post.content.trim().length > 140;

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
          <p className="text-sm font-semibold text-foreground">인생일지</p>
          <p className="text-xs text-muted">
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
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

      {/* Content area */}
      <CardBody className="space-y-3">
        {expanded ? (
          <>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
              {post.content}
            </p>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-sm font-semibold text-primary hover:opacity-80 transition"
            >
              접기
            </button>
          </>
        ) : (
          <div className="relative">
            <p className="line-clamp-3 pr-14 text-sm leading-relaxed text-muted">
              {post.content}
            </p>
            {shouldShowMore ? (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="absolute bottom-0 right-0 text-sm font-semibold text-primary hover:opacity-80 transition"
              >
                더 보기
              </button>
            ) : null}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
