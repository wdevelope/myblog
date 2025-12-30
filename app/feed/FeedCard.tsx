"use client";

import { useState } from "react";
import Link from "next/link";
import type { Post } from "@/lib/types";
import { Badge, Card, CardBody } from "@/app/_components/ui";
import DeletePostButton from "@/app/_components/DeletePostButton";

function coverSrcFromImageKey(key: string) {
  const [bucket, ...rest] = key.split(":");
  const objectPath = rest.join(":");
  const looksLikeSupabaseKey = Boolean(bucket && objectPath);
  if (!looksLikeSupabaseKey) return key;

  if (bucket === "post-images-public") {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!base) return null;
    const path = encodeURIComponent(objectPath).replaceAll("%2F", "/");
    return `${base}/storage/v1/object/public/${bucket}/${path}`;
  }

  return `/api/images?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(objectPath)}`;
}

export function FeedCard({ post, isAdmin }: { post: Post; isAdmin: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const coverKey = post.imageKeys?.[0];
  const coverSrc = coverKey ? coverSrcFromImageKey(coverKey) : null;

  return (
    <Card className="overflow-hidden transition hover:shadow-lg">
      {/* Instagram-style header with avatar */}
      <div className="flex items-center gap-3 border-b border-border p-4">
        <div className="size-10 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-[2px]">
          <div className="size-full rounded-full bg-surface flex items-center justify-center">
            <div className="size-[34px] rounded-full bg-gradient-to-br from-primary/60 to-purple-500/40" />
          </div>
        </div>
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
        <Badge variant={post.visibility === "public" ? "primary" : "warning"}>
          {post.visibility === "public" ? "공개" : "비공개"}
        </Badge>
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
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent p-5">
            <p className="line-clamp-2 text-base font-bold text-white">
              {post.title}
            </p>
          </div>
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
            <p className="text-lg font-bold text-foreground">{post.title}</p>
          </div>
        </div>
      )}

      {/* Content area */}
      <CardBody className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/feed/${post.slug}`}
            className="text-sm font-bold text-foreground hover:text-primary transition"
          >
            상세보기 →
          </Link>
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/feed/edit/${post.slug}`}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-surface px-3 text-sm font-bold text-foreground transition hover:bg-surface-2"
              >
                수정
              </Link>
              <DeletePostButton
                slug={post.slug}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-surface px-3 text-sm font-bold text-foreground transition hover:bg-surface-2"
              >
                삭제
              </DeletePostButton>
            </div>
          ) : null}
        </div>
        <p
          className={`text-sm leading-relaxed text-muted ${
            expanded ? "" : "line-clamp-3"
          }`}
        >
          {post.content}
        </p>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm font-semibold text-primary hover:opacity-80 transition"
        >
          {expanded ? "접기" : "더 보기"}
        </button>
      </CardBody>
    </Card>
  );
}
