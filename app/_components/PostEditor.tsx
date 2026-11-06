"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { PostType, Visibility } from "@/lib/types";
import { toAutoTitle } from "@/lib/markdown";
import { postHref } from "@/lib/constants";
import { savePost } from "@/lib/actions/posts";
import MarkdownEditor from "@/app/_components/MarkdownEditor";
import PostSettingsPanel from "@/app/_components/PostSettingsPanel";
import { useHydrated } from "@/app/_components/useHydrated";
import { usePostDraft, type PostDraft } from "@/app/_components/usePostDraft";

// Vercel 함수의 요청 본문 한도(4.5MB)를 넘으면 운영에서만 이유 없이 실패하므로 보내기 전에 막는다.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export default function PostEditor({
  type,
  defaultVisibility,
  defaultTitle = "",
  categories = [],
  initial,
  createdAtYmd,
  draftDate,
  deleteSlug,
  deleteRedirectTo,
}: {
  type: PostType;
  defaultVisibility?: Visibility;
  defaultTitle?: string;
  categories?: string[];
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
  // 새 다이어리는 날짜마다 임시저장 칸이 따로다. 칸을 같이 쓰면 다른 날짜의 초안을 불러와 제목과 날짜가 어긋난다.
  draftDate?: string;
  deleteSlug?: string;
  deleteRedirectTo?: string;
}) {
  const router = useRouter();
  const [visibility, setVisibility] = useState<Visibility>(
    initial?.visibility ?? defaultVisibility ?? "public"
  );
  const [title, setTitle] = useState(initial?.title ?? defaultTitle);
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
  const activeUploads = useRef(0);
  const hydrated = useHydrated();

  // Layout state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const draftKey = initial?.id
    ? `draft:post:edit:${initial.id}`
    : `draft:post:new:${type}${draftDate ? `:${draftDate}` : ""}`;

  const removeImageKey = useCallback(
    (key: string) => {
      setImageKeys((prev) => prev.filter((k) => k !== key));
    },
    [setImageKeys]
  );

  const { pendingDraft, saveDraft, clearDraft, dismissDraft } = usePostDraft({
    draftKey,
    type,
    defaultTitle,
    createdAtYmd,
    fields: { title, content, visibility, categorySlug, imageKeys, thumbnailImageKey },
  });

  const applyDraft = useCallback((draft: PostDraft) => {
    setTitle(draft.title);
    setContent(draft.content);
    setVisibility(draft.visibility);
    setCategorySlug(draft.categorySlug);
    setImageKeys(draft.imageKeys);
    setThumbnailImageKey(draft.thumbnailImageKey);
  }, []);

  // 첨부·썸네일·본문 이미지가 함께 쓰는 업로드. 글의 공개 범위 버킷으로 올린다.
  // 요청 본문 한도는 요청마다 걸리므로 한 장씩 보낸다. 실패해도 예외를 내지 않아야 본문의 자리표시자가 지워진다.
  const uploadFiles = useCallback(
    async (
      files: FileList | File[] | null,
      addToGallery = true,
      notify: (message: string) => void = setError
    ) => {
      setError(null);
      if (!files?.length) return [];

      activeUploads.current += 1;
      const keys: string[] = [];
      for (const file of Array.from(files)) {
        if (file.size > MAX_UPLOAD_BYTES) {
          notify(`4MB가 넘어 올리지 못했어요: ${file.name}`);
          continue;
        }

        const form = new FormData();
        form.set("visibility", type === "feed" ? "public" : visibility);
        form.append("files", file);

        try {
          const response = await fetch("/api/images", {
            method: "POST",
            body: form,
          });
          const payload = (await response.json().catch(() => null)) as
            | { keys?: string[]; error?: string }
            | null;
          if (response.ok) keys.push(...(payload?.keys ?? []));
          else notify(payload?.error ?? "업로드에 실패했어요.");
        } catch {
          notify("업로드에 실패했어요. 연결을 확인하고 다시 시도해 주세요.");
          break;
        }
      }
      activeUploads.current -= 1;

      if (addToGallery) {
        setImageKeys((prev) => [...prev, ...keys]);
      }
      return keys;
    },
    [type, visibility]
  );

  function submit() {
    setError(null);
    const trimmedContent = content.trim();

    // 올리는 중에 저장하면 자리표시자 글자가 본문에 남고 첨부가 빠진다.
    if (activeUploads.current > 0) {
      return setError("이미지를 올리는 중이에요. 끝난 뒤 발행해 주세요.");
    }
    if (!trimmedContent) return setError("내용을 입력해주세요.");
    if (type === "blog" && !categorySlug.trim()) {
      return setError("아티클은 카테고리가 필요해요.");
    }

    const trimmedTitle =
      type === "feed" ? toAutoTitle(trimmedContent) : title.trim();
    if (type !== "feed" && !trimmedTitle)
      return setError("제목을 입력해주세요.");

    // 저장까지 transition에 넣어야 isPending이 켜져 발행 버튼이 막힌다. 막히지 않으면 두 번 눌러 새 글이 두 개 생긴다.
    startTransition(async () => {
      const result = await savePost({
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
      }).catch(() => null);

      if (!result?.success) {
        setError(result?.error ?? "글 저장에 실패했어요.");
        return;
      }

      clearDraft();
      // 저장 응답이 관리자 화면을 켜고 브라우저의 화면 캐시도 비워, 상세만 받으면 된다.
      startTransition(() => {
        router.push(postHref(result.data.type, result.data.slug));
      });
    });
  }

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
            aria-label="뒤로 가기"
          >
            <ArrowLeft className="size-6" aria-hidden />
          </button>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <span className="text-sm text-muted font-medium mr-2">
            {content.length}자
          </span>
          <button
            type="button"
            onClick={saveDraft}
            className="px-4 py-2 text-sm font-bold text-muted hover:bg-surface-2 rounded-lg transition"
          >
            저장
          </button>

          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="px-5 py-2 rounded-lg bg-success hover:brightness-110 text-background text-sm font-bold shadow-sm transition disabled:opacity-50"
          >
            발행
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden bg-background">
        <div className="flex-1 flex flex-col min-w-0 overflow-visible relative">
          {hydrated && pendingDraft ? (
            <div className="fixed bottom-6 right-6 z-50 w-[calc(100%-3rem)] max-w-sm p-4 rounded-xl bg-surface border border-border shadow-2xl flex flex-col gap-3 animate-in slide-in-from-bottom-2 fade-in duration-300">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">
                    임시저장된 글이 있습니다
                  </p>
                  <p className="text-xs text-muted">
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
                    dismissDraft();
                  }}
                  className="px-3 py-1.5 text-xs font-bold bg-success text-background rounded-lg hover:brightness-110 shadow-sm transition"
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
                // 쓰는 동안에는 글 설정 창이 닫혀 있어 창 안의 오류 문구가 보이지 않는다.
                onUploadImages={(files) => uploadFiles(files, false, toast.error)}
                placeholder="내용을 입력하세요."
                compact={type === "feed"}
              />
            </div>
          </div>
        </div>
      </div>

      <PostSettingsPanel
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        type={type}
        visibility={visibility}
        onVisibilityChange={setVisibility}
        categorySlug={categorySlug}
        onCategoryChange={setCategorySlug}
        categories={categories}
        imageKeys={imageKeys}
        onRemoveImage={removeImageKey}
        thumbnailImageKey={thumbnailImageKey}
        onThumbnailChange={setThumbnailImageKey}
        onUpload={uploadFiles}
        error={error}
        isPending={isPending}
        onSubmit={submit}
        deleteSlug={deleteSlug}
        deleteRedirectTo={deleteRedirectTo}
      />
    </div>
  );
}
