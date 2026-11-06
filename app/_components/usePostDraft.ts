import { useCallback, useEffect, useRef, useState } from "react";
import type { PostType, Visibility } from "@/lib/types";
import { formatPostDate } from "@/lib/utils";

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

const OLD_DIARY_DRAFT_KEY = "draft:post:new:diary";

// 새 다이어리 초안은 날짜별 칸에 둔다. 칸 하나를 같이 쓰던 때의 초안은 그 날짜 칸으로 옮겨야 알림으로 찾을 수 있다.
function moveOldDiaryDraft() {
  const raw = localStorage.getItem(OLD_DIARY_DRAFT_KEY);
  if (!raw) return;
  const { createdAtYmd, updatedAt } = JSON.parse(raw) as PostDraft;
  localStorage.setItem(`${OLD_DIARY_DRAFT_KEY}:${createdAtYmd ?? formatPostDate(updatedAt)}`, raw);
  localStorage.removeItem(OLD_DIARY_DRAFT_KEY);
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

  // 화면이 처음 채운 값(서버 본문·기본 제목)은 쓴 내용이 아니다. 이 값으로 저장하면 아직 불러오지 않은 임시저장 글을 덮는다.
  const [openedDraft] = useState(buildDraft);
  const autoSaveTimer = useRef<number | undefined>(undefined);

  // localStorage는 브라우저에만 있어, 알림은 hydration 뒤(hydrated)에만 그린다.
  const [pendingDraft, setPendingDraft] = useState<PostDraft | null>(() => {
    if (typeof window === "undefined") return null;

    try {
      if (type === "diary") moveOldDiaryDraft();
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
      if (!hasMeaningfulDraft(draft, defaultTitle) || !differsFrom(openedDraft, draft)) return;
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      // ignore
    }
  }, [buildDraft, defaultTitle, draftKey, openedDraft]);

  const clearDraft = useCallback(() => {
    // 기다리던 자동 저장이 돌면 발행으로 지운 글이 임시저장으로 되살아난다.
    window.clearTimeout(autoSaveTimer.current);
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
    setPendingDraft(null);
  }, [draftKey]);

  const dismissDraft = useCallback(() => setPendingDraft(null), []);

  useEffect(() => {
    autoSaveTimer.current = window.setTimeout(saveDraft, 800);
    return () => window.clearTimeout(autoSaveTimer.current);
  }, [saveDraft]);

  return { pendingDraft, saveDraft, clearDraft, dismissDraft };
}
