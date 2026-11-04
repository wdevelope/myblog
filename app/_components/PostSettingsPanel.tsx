"use client";

import { useId, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, ImageIcon, Lock, Trash2, X } from "lucide-react";
import type { PostType, Visibility } from "@/lib/types";
import { coverSrcFromImageKey } from "@/lib/image";
import { cn } from "@/lib/utils";
import DeletePostButton from "@/app/_components/DeletePostButton";

// 발행 버튼으로 여는 글 설정 패널. 값은 PostEditor가 들고, 여기서는 보여 주고 바꾸는 일만 한다.
export default function PostSettingsPanel({
  isOpen,
  onClose,
  type,
  visibility,
  onVisibilityChange,
  categorySlug,
  onCategoryChange,
  categories,
  imageKeys,
  onRemoveImage,
  thumbnailImageKey,
  onThumbnailChange,
  onUpload,
  error,
  isPending,
  onSubmit,
  deleteSlug,
  deleteRedirectTo,
}: {
  isOpen: boolean;
  onClose: () => void;
  type: PostType;
  visibility: Visibility;
  onVisibilityChange: (visibility: Visibility) => void;
  categorySlug: string;
  onCategoryChange: (slug: string) => void;
  categories: string[];
  imageKeys: string[];
  onRemoveImage: (key: string) => void;
  thumbnailImageKey: string;
  onThumbnailChange: (key: string) => void;
  onUpload: (files: FileList | null, addToGallery: boolean) => Promise<string[]>;
  error: string | null;
  isPending: boolean;
  onSubmit: () => void;
  deleteSlug?: string;
  deleteRedirectTo?: string;
}) {
  const componentId = useId();
  const fileInputId = `post-editor-files-${componentId}`;
  const thumbnailInputId = `post-editor-thumbnail-${componentId}`;

  const categoryOptions = useMemo(() => {
    const current = categorySlug.trim();
    const list = categories.slice();
    if (current && !list.includes(current)) list.unshift(current);
    return list;
  }, [categories, categorySlug]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-50 bg-black/20 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute right-0 top-0 bottom-0 z-50 w-80 bg-surface border-l border-border shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-bold">글 설정</h3>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-surface-2 rounded-lg"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-6">
              {/* Visibility */}
              {type !== "feed" && (
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-muted">
                    공개 설정
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-surface-2 rounded-xl border border-border">
                    <button
                      type="button"
                      onClick={() => onVisibilityChange("public")}
                      className={cn(
                        "py-2 flex items-center justify-center rounded-lg transition",
                        visibility === "public"
                          ? "bg-background shadow-sm text-emerald-500"
                          : "text-muted hover:text-foreground"
                      )}
                      title="공개"
                    >
                      <Globe className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onVisibilityChange("private")}
                      className={cn(
                        "py-2 flex items-center justify-center rounded-lg transition",
                        visibility === "private"
                          ? "bg-background shadow-sm text-amber-500"
                          : "text-muted hover:text-foreground"
                      )}
                      title="비공개"
                    >
                      <Lock className="size-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Category */}
              {type === "blog" && (
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-muted">
                    카테고리
                  </label>
                  <select
                    value={categorySlug}
                    onChange={(e) => onCategoryChange(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-base sm:text-sm outline-none focus:border-primary transition"
                  >
                    <option value="">카테고리 선택</option>
                    {categoryOptions.map((slug) => (
                      <option key={slug} value={slug}>
                        {slug}
                        {categories.includes(slug) ? "" : " (삭제됨)"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Images */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-muted">
                    이미지
                  </label>
                  <span className="text-xs text-muted bg-surface-2 px-2 py-0.5 rounded-full">
                    {imageKeys.length}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {imageKeys.map((key, idx) => (
                    <div
                      key={key}
                      className="relative group aspect-square bg-surface-2 rounded-lg overflow-hidden border border-border"
                    >
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-muted break-all p-2 text-center">
                        이미지 {idx + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveImage(key)}
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 [@media(hover:hover)]:opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                  <label
                    htmlFor={fileInputId}
                    className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition cursor-pointer"
                  >
                    <ImageIcon className="size-6 text-muted mb-2" />
                    <span className="text-xs font-bold text-muted">
                      추가하기
                    </span>
                  </label>
                </div>
                <input
                  id={fileInputId}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => void onUpload(e.target.files, true)}
                />
              </div>

              {/* Thumbnail Manager */}
              {type === "blog" && (
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-muted">
                    대표 이미지 (썸네일)
                  </label>
                  {thumbnailImageKey ? (
                    <div className="relative aspect-video rounded-xl bg-surface-2 border border-border overflow-hidden group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          coverSrcFromImageKey(thumbnailImageKey) ??
                          thumbnailImageKey
                        }
                        alt="Thumbnail"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => onThumbnailChange("")}
                        className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 [@media(hover:hover)]:opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor={thumbnailInputId}
                      className="flex flex-col items-center justify-center aspect-video rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition cursor-pointer"
                    >
                      <ImageIcon className="size-8 text-muted mb-2" />
                      <span className="text-sm font-bold text-muted">
                        썸네일 업로드
                      </span>
                      <input
                        id={thumbnailInputId}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const keys = await onUpload(e.target.files, false);
                          if (keys.length > 0) onThumbnailChange(keys[0]);
                        }}
                      />
                    </label>
                  )}
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 text-red-500 text-sm font-medium">
                  {error}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border mt-auto flex flex-col gap-2">
              <button
                type="button"
                onClick={onSubmit}
                disabled={isPending}
                className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending ? "발행 중..." : "발행하기"}
              </button>

              {deleteSlug && (
                <DeletePostButton
                  slug={deleteSlug}
                  redirectTo={deleteRedirectTo}
                  className="w-full h-11 rounded-xl border border-red-500/20 text-red-500 font-bold hover:bg-red-500/5 transition flex items-center justify-center gap-2"
                >
                  <Trash2 className="size-4" />
                  삭제하기
                </DeletePostButton>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
