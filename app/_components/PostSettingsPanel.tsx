"use client";

import { useEffect, useId, useMemo, useRef } from "react";
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const componentId = useId();
  const titleId = `post-settings-title-${componentId}`;
  const visibilityLabelId = `post-settings-visibility-${componentId}`;
  const categoryInputId = `post-settings-category-${componentId}`;

  const categoryOptions = useMemo(() => {
    const current = categorySlug.trim();
    const list = categories.slice();
    if (current && !list.includes(current)) list.unshift(current);
    return list;
  }, [categories, categorySlug]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-80 max-w-full translate-x-full border-l border-border bg-surface p-0 text-foreground shadow-2xl transition-[translate,display,overlay] transition-discrete duration-300 ease-out open:translate-x-0 motion-reduce:transition-none starting:open:translate-x-full backdrop:bg-black/20 backdrop:backdrop-blur-sm lg:backdrop:bg-transparent lg:backdrop:backdrop-blur-none"
    >
      <div className="flex h-full flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 id={titleId} className="font-bold">글 설정</h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="닫기"
                className="p-2 hover:bg-surface-2 rounded-lg"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-6">
              {/* Visibility */}
              {type !== "feed" && (
                <div className="space-y-3">
                  <p id={visibilityLabelId} className="text-sm font-bold text-muted">
                    공개 설정
                  </p>
                  <div
                    role="group"
                    aria-labelledby={visibilityLabelId}
                    className="grid grid-cols-2 gap-2 p-1 bg-surface-2 rounded-xl border border-border"
                  >
                    <button
                      type="button"
                      onClick={() => onVisibilityChange("public")}
                      className={cn(
                        "py-2 flex items-center justify-center rounded-lg transition",
                        visibility === "public"
                          ? "bg-background shadow-sm text-success"
                          : "text-muted hover:text-foreground"
                      )}
                      title="공개"
                      aria-label="공개"
                      aria-pressed={visibility === "public"}
                    >
                      <Globe className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => onVisibilityChange("private")}
                      className={cn(
                        "py-2 flex items-center justify-center rounded-lg transition",
                        visibility === "private"
                          ? "bg-background shadow-sm text-warning"
                          : "text-muted hover:text-foreground"
                      )}
                      title="비공개"
                      aria-label="비공개"
                      aria-pressed={visibility === "private"}
                    >
                      <Lock className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>
              )}

              {/* Category */}
              {type === "blog" && (
                <div className="space-y-3">
                  <label htmlFor={categoryInputId} className="block text-sm font-bold text-muted">
                    카테고리
                  </label>
                  <select
                    id={categoryInputId}
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
                  <p className="text-sm font-bold text-muted">이미지</p>
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
                        aria-label={`이미지 ${idx + 1} 빼기`}
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition"
                      >
                        <X className="size-3" aria-hidden />
                      </button>
                    </div>
                  ))}
                  <label className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 has-focus-visible:border-primary transition cursor-pointer">
                    <ImageIcon className="size-6 text-muted mb-2" aria-hidden />
                    <span className="text-xs font-bold text-muted">
                      추가하기
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(e) => void onUpload(e.target.files, true)}
                    />
                  </label>
                </div>
              </div>

              {/* Thumbnail Manager */}
              {type === "blog" && (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-muted">대표 이미지 (썸네일)</p>
                  {thumbnailImageKey ? (
                    <div className="relative aspect-video rounded-xl bg-surface-2 border border-border overflow-hidden group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          coverSrcFromImageKey(thumbnailImageKey) ??
                          thumbnailImageKey
                        }
                        alt="대표 이미지"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => onThumbnailChange("")}
                        aria-label="대표 이미지 지우기"
                        className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition"
                      >
                        <X className="size-4" aria-hidden />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center aspect-video rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 has-focus-visible:border-primary transition cursor-pointer">
                      <ImageIcon className="size-8 text-muted mb-2" aria-hidden />
                      <span className="text-sm font-bold text-muted">
                        썸네일 업로드
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
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
                <div role="alert" className="p-3 rounded-xl bg-danger/10 text-danger text-sm font-medium">
                  {error}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border mt-auto flex flex-col gap-2">
              <button
                type="button"
                onClick={onSubmit}
                disabled={isPending}
                className="w-full h-11 rounded-xl bg-success hover:brightness-110 text-background font-bold shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending ? "발행 중..." : "발행하기"}
              </button>

              {deleteSlug && (
                <DeletePostButton
                  slug={deleteSlug}
                  redirectTo={deleteRedirectTo}
                  className="w-full h-11 rounded-xl border border-danger/20 text-danger font-bold hover:bg-danger/5 transition flex items-center justify-center gap-2"
                >
                  <Trash2 className="size-4" aria-hidden />
                  삭제하기
                </DeletePostButton>
              )}
            </div>
      </div>
    </dialog>
  );
}
