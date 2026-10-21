"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiImage, FiX, FiTrash2, FiGlobe, FiLock } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import type { PostType, Visibility } from "@/lib/types";
import { toAutoTitle } from "@/lib/markdown";
import { coverSrcFromImageKey } from "@/lib/image";
import { postHref } from "@/lib/constants";
// import PostImages from "@/app/_components/PostImages";
import DeletePostButton from "@/app/_components/DeletePostButton";
import { cn } from "@/lib/utils";
import { getCategories } from "@/lib/actions/categories";
import { createPost } from "@/lib/actions/posts";
import MarkdownEditor from "@/app/_components/MarkdownEditor";

type DraftPayloadV1 = {
  version: 1;
  type: PostType;
  title: string;
  content: string;
  visibility: Visibility;
  categorySlug: string;
  imageKeys: string[];
  thumbnailImageKey: string;
  createdAtYmd?: string;
  updatedAt: string;
};

// ... (Helper functions like typeLabel can remain or be inline)
// function typeLabel(type: PostType) {
//   if (type === "blog") return "아티클";
//   if (type === "feed") return "피드";
//   return "다이어리";
// }

export default function PostEditor({
  type,
  defaultVisibility,
  initial,
  createdAtYmd,
  deleteSlug,
  deleteRedirectTo,
}: {
  type: PostType;
  defaultVisibility?: Visibility;
  initial?: {
    id: string;
    slug: string;
    title: string;
    content: string;
    visibility: Visibility;
    categorySlug?: string | null;
    imageKeys?: string[];
    thumbnailImageKey?: string | null;
  };
  createdAtYmd?: string;
  deleteSlug?: string;
  deleteRedirectTo?: string;
}) {
  const router = useRouter();
  // const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const componentId = useId();
  const [visibility, setVisibility] = useState<Visibility>(
    initial?.visibility ?? defaultVisibility ?? "public"
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [categorySlug, setCategorySlug] = useState(
    initial?.categorySlug?.trim() ?? ""
  );
  const [content, setContent] = useState(initial?.content ?? "");
  const [imageKeys, setImageKeys] = useState<string[]>(
    initial?.imageKeys ?? []
  );
  const [thumbnailImageKey, setThumbnailImageKey] = useState<string>(
    initial?.thumbnailImageKey?.trim() ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [categories, setCategories] = useState<string[]>([]);
  const fileInputId = useMemo(
    () => `post-editor-files-${componentId}`,
    [componentId]
  );
  const thumbnailInputId = useMemo(
    () => `post-editor-thumbnail-${componentId}`,
    [componentId]
  );
  const [pendingDraft, setPendingDraft] = useState<DraftPayloadV1 | null>(null);
  // const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [, setDraftSavedAt] = useState<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  // Guard to ensure we check for drafts only once per session
  const hasCheckedDraft = useRef(false);
  const lastCheckedKey = useRef<string | null>(null);

  // Layout state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- LOGIC SECTION (Copied & Adapted) ---

  const draftKey = useMemo(() => {
    if (initial?.id) return `draft:post:edit:${initial.id}`;
    return `draft:post:new:${type}`;
  }, [initial?.id, type]);

  const removeImageKey = useCallback(
    (key: string) => {
      setImageKeys((prev) => prev.filter((k) => k !== key));
      // setThumbnailImageKey((prev) => (prev === key ? "" : prev));
    },
    [setImageKeys]
  );

  const categoryOptions = useMemo(() => {
    const current = categorySlug.trim();
    const list = categories.slice();
    if (current && !list.includes(current)) list.unshift(current);
    return list;
  }, [categories, categorySlug]);

  const buildDraftPayload = useCallback((): DraftPayloadV1 => {
    return {
      version: 1,
      type,
      title,
      content,
      visibility: type === "feed" ? "public" : visibility,
      categorySlug,
      imageKeys,
      thumbnailImageKey,
      createdAtYmd,
      updatedAt: new Date().toISOString(),
    };
  }, [
    categorySlug,
    content,
    createdAtYmd,
    imageKeys,
    thumbnailImageKey,
    title,
    type,
    visibility,
  ]);

  const hasMeaningfulDraft = useCallback((draft: DraftPayloadV1) => {
    if (draft.type === "blog" && draft.categorySlug.trim()) return true;
    if (draft.type !== "feed" && draft.title.trim()) return true;
    if (draft.content.trim()) return true;
    if (draft.imageKeys.length > 0) return true;
    if (draft.type === "blog" && draft.thumbnailImageKey.trim()) return true;
    if (draft.type === "diary" && draft.createdAtYmd?.trim()) return true;
    return false;
  }, []);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
    setPendingDraft(null);
    setDraftSavedAt(null);
  }, [draftKey]);

  const dismissDraft = useCallback(() => {
    setPendingDraft(null);
  }, []);

  const applyDraft = useCallback((draft: DraftPayloadV1) => {
    setTitle(draft.title);
    setContent(draft.content);
    setVisibility(draft.visibility);
    setCategorySlug(draft.categorySlug);
    setImageKeys(draft.imageKeys);
    setThumbnailImageKey(draft.thumbnailImageKey);
    setDraftSavedAt(draft.updatedAt);
  }, []);

  const refreshCategories = useCallback(async () => {
    if (type !== "blog") return;
    try {
      const result = await getCategories();
      if (!result.success) return;
      const slugs = (result.categories ?? [])
        .map((c) => c.slug)
        .filter(
          (v): v is string => typeof v === "string" && v.trim().length > 0
        );
      setCategories(Array.from(new Set(slugs)));
    } finally {
      // ignore
    }
  }, [type]);

  useEffect(() => {
    void refreshCategories();
  }, [refreshCategories]);

  useEffect(() => {
    if (type !== "feed") return;
    if (visibility !== "public") setVisibility("public");
  }, [type, visibility]);

  // Removed auto-clear thumbnail logic to allow independent thumbnails
  // useEffect(() => {
  //   if (type !== "blog") return;
  //   if (!thumbnailImageKey.trim()) return;
  //   if (imageKeys.includes(thumbnailImageKey)) return;
  //   setThumbnailImageKey("");
  // }, [type, imageKeys, thumbnailImageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Reset check status if key changes
    if (lastCheckedKey.current !== draftKey) {
      hasCheckedDraft.current = false;
      lastCheckedKey.current = draftKey;
    }

    if (hasCheckedDraft.current) return;

    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) {
        hasCheckedDraft.current = true;
        return;
      }
      const parsed = JSON.parse(raw) as DraftPayloadV1;
      if (!parsed || parsed.version !== 1) {
        hasCheckedDraft.current = true;
        return;
      }
      if (parsed.type !== type) {
        hasCheckedDraft.current = true;
        return;
      }
      if (!hasMeaningfulDraft(parsed)) {
        hasCheckedDraft.current = true;
        return;
      }

      const current = buildDraftPayload();
      const differs =
        parsed.title !== current.title ||
        parsed.content !== current.content ||
        parsed.visibility !== current.visibility ||
        parsed.categorySlug !== current.categorySlug ||
        parsed.thumbnailImageKey !== current.thumbnailImageKey ||
        parsed.createdAtYmd !== current.createdAtYmd ||
        JSON.stringify(parsed.imageKeys) !== JSON.stringify(current.imageKeys);

      hasCheckedDraft.current = true;

      if (!differs) return;

      setPendingDraft(parsed);
      setDraftSavedAt(parsed.updatedAt);
    } catch {
      // ignore
      hasCheckedDraft.current = true;
    }
  }, [buildDraftPayload, draftKey, hasMeaningfulDraft, type]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

    saveTimerRef.current = window.setTimeout(() => {
      try {
        const draft = buildDraftPayload();
        if (!hasMeaningfulDraft(draft)) return;
        localStorage.setItem(draftKey, JSON.stringify(draft));
        setDraftSavedAt(draft.updatedAt);
      } catch {
        // ignore
      }
    }, 800);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [buildDraftPayload, draftKey, hasMeaningfulDraft]);

  // 첨부·썸네일·본문 이미지가 함께 쓰는 업로드. 글의 공개 범위 버킷으로 올린다.
  const uploadFiles = useCallback(
    async (files: FileList | File[] | null, addToGallery = true) => {
      setError(null);
      if (!files?.length) return [];

      const form = new FormData();
      form.set("visibility", type === "feed" ? "public" : visibility);
      for (const file of Array.from(files)) {
        form.append("files", file);
      }

      const response = await fetch("/api/images", {
        method: "POST",
        body: form,
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
          details?: string;
        } | null;
        setError(payload?.details ?? payload?.error ?? "업로드에 실패했어요.");
        return [];
      }

      const payload = (await response.json()) as { keys: string[] };
      const newKeys = payload.keys ?? [];
      if (addToGallery) {
        setImageKeys((prev) => [...prev, ...newKeys]);
      }
      return newKeys;
    },
    [type, visibility]
  );

  async function submit() {
    setError(null);
    const trimmedContent = content.trim();

    if (!trimmedContent) return setError("내용을 입력해주세요.");
    if (type === "blog" && !categorySlug.trim()) {
      return setError("아티클은 카테고리가 필요해요.");
    }

    const trimmedTitle =
      type === "feed" ? toAutoTitle(trimmedContent) : title.trim();
    if (type !== "feed" && !trimmedTitle)
      return setError("제목을 입력해주세요.");

    const result = await createPost({
      id: initial?.id,
      slug: initial?.slug,
      type,
      visibility: type === "feed" ? "public" : visibility,
      title: trimmedTitle,
      content: trimmedContent,
      categorySlug: type === "blog" ? categorySlug.trim() : null,
      imageKeys,
      thumbnailImageKey:
        type === "blog" ? thumbnailImageKey.trim() || null : null,
      createdAtYmd:
        type === "diary" && !initial?.id && createdAtYmd
          ? createdAtYmd
          : undefined,
    });

    if (!result.success) {
      setError(result.error ?? "글 저장에 실패했어요.");
      return;
    }

    clearDraft();
    startTransition(() => {
      router.push(postHref(result.data.type, result.data.slug));
      router.refresh();
    });
  }

  // --- UI RENDER ---

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col h-dvh">
      {/* Top Bar */}
      <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4 md:px-6 shrink-0 z-50 sticky top-0">
        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center justify-center size-10 rounded-full hover:bg-surface-2 transition text-muted"
            title="뒤로 가기"
          >
            <FiArrowLeft className="size-6" />
          </button>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <span className="text-sm text-gray-400 font-medium mr-2">
            {content.length}자
          </span>
          <button
            type="button"
            onClick={() => {
              const draft = buildDraftPayload();
              if (!hasMeaningfulDraft(draft)) return;
              localStorage.setItem(draftKey, JSON.stringify(draft));
              setDraftSavedAt(draft.updatedAt);
            }}
            className="px-4 py-2 text-sm font-bold text-muted hover:bg-surface-2 rounded-lg transition"
          >
            저장
          </button>

          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="px-5 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-500 text-white text-sm font-bold shadow-sm transition disabled:opacity-50"
          >
            발행
          </button>
        </div>
      </header>

      {/* ... (Editor Content remains same) */}
      <div className="flex-1 flex overflow-hidden bg-background">
        <div className="flex-1 flex flex-col min-w-0 overflow-visible relative">
          {pendingDraft ? (
            <div className="fixed bottom-6 right-6 z-50 w-[calc(100%-3rem)] max-w-sm p-4 rounded-xl bg-surface border border-border shadow-2xl flex flex-col gap-3 animate-in slide-in-from-bottom-2 fade-in duration-300">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">
                    임시저장된 글이 있습니다
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(pendingDraft.updatedAt).toLocaleTimeString()}에
                    저장됨
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={dismissDraft}
                  className="px-3 py-1.5 text-xs font-bold hover:bg-surface-2 rounded-lg text-muted hover:text-foreground transition"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    applyDraft(pendingDraft);
                    setPendingDraft(null);
                  }}
                  className="px-3 py-1.5 text-xs font-bold bg-emerald-500 text-white rounded-lg hover:brightness-110 shadow-sm transition"
                >
                  불러오기
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex-1 overflow-auto w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative">
            <div className="h-full">
              <MarkdownEditor
                title={title}
                onTitleChange={type === "feed" ? undefined : setTitle}
                value={content}
                onChange={setContent}
                onUploadImages={(files) => uploadFiles(files, false)}
                placeholder="내용을 입력하세요."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Settings Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
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
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 hover:bg-surface-2 rounded-lg"
                >
                  <FiX className="size-5" />
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
                        onClick={() => setVisibility("public")}
                        className={cn(
                          "py-2 flex items-center justify-center rounded-lg transition",
                          visibility === "public"
                            ? "bg-background shadow-sm text-emerald-500"
                            : "text-muted hover:text-foreground"
                        )}
                        title="공개"
                      >
                        <FiGlobe className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisibility("private")}
                        className={cn(
                          "py-2 flex items-center justify-center rounded-lg transition",
                          visibility === "private"
                            ? "bg-background shadow-sm text-amber-500"
                            : "text-muted hover:text-foreground"
                        )}
                        title="비공개"
                      >
                        <FiLock className="size-4" />
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
                      onChange={(e) => setCategorySlug(e.target.value)}
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
                          onClick={() => removeImageKey(key)}
                          className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 [@media(hover:hover)]:opacity-0 group-hover:opacity-100 transition"
                        >
                          <FiX className="size-3" />
                        </button>
                      </div>
                    ))}
                    <label
                      htmlFor={fileInputId}
                      className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition cursor-pointer"
                    >
                      <FiImage className="size-6 text-muted mb-2" />
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
                    onChange={(e) => void uploadFiles(e.target.files, true)}
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
                          onClick={() => setThumbnailImageKey("")}
                          className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 [@media(hover:hover)]:opacity-0 group-hover:opacity-100 transition"
                        >
                          <FiX className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor={thumbnailInputId}
                        className="flex flex-col items-center justify-center aspect-video rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition cursor-pointer"
                      >
                        <FiImage className="size-8 text-muted mb-2" />
                        <span className="text-sm font-bold text-muted">
                          썸네일 업로드
                        </span>
                        <input
                          id={thumbnailInputId}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const keys = await uploadFiles(
                              e.target.files,
                              false
                            );
                            if (keys.length > 0) {
                              setThumbnailImageKey(keys[0]);
                            }
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
                  onClick={submit}
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
                    <FiTrash2 className="size-4" />
                    삭제하기
                  </DeletePostButton>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
