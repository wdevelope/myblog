import { useCallback, useEffect, useState } from "react";
import type { PostType, Visibility } from "@/lib/types";

export type PostDraft = {
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

type DraftFields = Pick<
  PostDraft,
  "title" | "content" | "visibility" | "categorySlug" | "imageKeys" | "thumbnailImageKey"
>;

function hasMeaningfulDraft(draft: PostDraft, defaultTitle: string) {
  if (draft.type === "blog" && draft.categorySlug.trim()) return true;
  // 화면이 채운 기본 제목은 쓴 내용이 아니다. 임시저장하면 다음 날 날짜만 다른 불러오기 알림이 뜬다.
  if (draft.type !== "feed" && draft.title.trim() && draft.title !== defaultTitle) return true;
  if (draft.content.trim()) return true;
  if (draft.imageKeys.length > 0) return true;
  if (draft.type === "blog" && draft.thumbnailImageKey.trim()) return true;
  if (draft.type === "diary" && draft.createdAtYmd?.trim()) return true;
  return false;
}

function differsFrom(saved: PostDraft, current: PostDraft) {
  return (
    saved.title !== current.title ||
    saved.content !== current.content ||
    saved.visibility !== current.visibility ||
    saved.categorySlug !== current.categorySlug ||
    saved.thumbnailImageKey !== current.thumbnailImageKey ||
    saved.createdAtYmd !== current.createdAtYmd ||
    JSON.stringify(saved.imageKeys) !== JSON.stringify(current.imageKeys)
  );
}

// 글 에디터의 임시저장. 입력이 멈추면 저장하고, 처음 그릴 때 지금 내용과 다른 임시저장 글을 pendingDraft로 알린다.
export function usePostDraft({
  draftKey,
  type,
  defaultTitle,
  createdAtYmd,
  fields,
}: {
  draftKey: string;
  type: PostType;
  defaultTitle: string;
  createdAtYmd?: string;
  fields: DraftFields;
}) {
  const { title, content, visibility, categorySlug, imageKeys, thumbnailImageKey } = fields;

  const buildDraft = useCallback(
    (): PostDraft => ({
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
    }),
    [categorySlug, content, createdAtYmd, imageKeys, thumbnailImageKey, title, type, visibility],
  );

  // localStorage는 브라우저에만 있어, 알림은 hydration 뒤(hydrated)에만 그린다.
  const [pendingDraft, setPendingDraft] = useState<PostDraft | null>(() => {
    if (typeof window === "undefined") return null;

    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PostDraft;
      if (!parsed || parsed.version !== 1) return null;
      if (parsed.type !== type) return null;
      if (!hasMeaningfulDraft(parsed, defaultTitle)) return null;
      return differsFrom(parsed, buildDraft()) ? parsed : null;
    } catch {
      return null;
    }
  });

  const saveDraft = useCallback(() => {
    try {
      const draft = buildDraft();
      if (!hasMeaningfulDraft(draft, defaultTitle)) return;
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      // ignore
    }
  }, [buildDraft, defaultTitle, draftKey]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
    setPendingDraft(null);
  }, [draftKey]);

  const dismissDraft = useCallback(() => setPendingDraft(null), []);

  useEffect(() => {
    const timer = window.setTimeout(saveDraft, 800);
    return () => window.clearTimeout(timer);
  }, [saveDraft]);

  return { pendingDraft, saveDraft, clearDraft, dismissDraft };
}
