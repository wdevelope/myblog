"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import type { PostType, Visibility } from "@/lib/types";
import { toAutoTitle } from "@/lib/markdown";
import MarkdownClient from "@/app/_components/MarkdownClient";

function typeLabel(type: PostType) {
  if (type === "blog") return "아티클";
  if (type === "feed") return "피드";
  return "다이어리";
}

function VisibilitySegmented({
  value,
  onChange,
  disabled,
}: {
  value: Visibility;
  onChange: (next: Visibility) => void;
  disabled?: boolean;
}) {
  const isPublic = value === "public";
  return (
    <div className="inline-flex overflow-hidden rounded-xl border border-border bg-background p-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("public")}
        className={[
          "h-9 rounded-lg px-3 text-sm font-bold transition",
          isPublic
            ? "bg-surface text-foreground shadow-sm"
            : "text-muted hover:text-foreground",
          disabled ? "opacity-50" : null,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        공개
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("private")}
        className={[
          "h-9 rounded-lg px-3 text-sm font-bold transition",
          !isPublic
            ? "bg-surface text-foreground shadow-sm"
            : "text-muted hover:text-foreground",
          disabled ? "opacity-50" : null,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        비공개
      </button>
    </div>
  );
}

export default function PostEditor({
  type,
  defaultVisibility,
  initial,
  createdAtYmd,
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
}) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
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
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const fileInputId = useMemo(
    () => `post-editor-files-${Math.random().toString(16).slice(2)}`,
    []
  );

  const removeImageKey = useCallback(
    (key: string) => {
      setImageKeys((prev) => prev.filter((k) => k !== key));
      setThumbnailImageKey((prev) => (prev === key ? "" : prev));
    },
    [setImageKeys, setThumbnailImageKey]
  );

  const categoryOptions = useMemo(() => {
    const current = categorySlug.trim();
    const list = categories.slice();
    if (current && !list.includes(current)) list.unshift(current);
    return list;
  }, [categories, categorySlug]);

  async function refreshCategories() {
    if (type !== "blog") return;
    setCategoriesLoading(true);
    try {
      const response = await fetch("/api/categories", { method: "GET" });
      if (!response.ok) return;
      const payload = (await response.json()) as {
        categories: Array<{
          slug: string;
          visibility: "public" | "private";
          sortOrder: number;
          inUse?: number;
        }>;
      };
      const slugs = (payload.categories ?? [])
        .map((c) => c.slug)
        .filter(
          (v): v is string => typeof v === "string" && v.trim().length > 0
        );
      setCategories(Array.from(new Set(slugs)));
    } finally {
      setCategoriesLoading(false);
    }
  }

  useEffect(() => {
    void refreshCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  useEffect(() => {
    if (type !== "feed") return;
    if (visibility !== "public") setVisibility("public");
  }, [type, visibility]);

  useEffect(() => {
    if (type !== "blog") return;
    if (!thumbnailImageKey.trim()) return;
    if (imageKeys.includes(thumbnailImageKey)) return;
    setThumbnailImageKey("");
  }, [type, imageKeys, thumbnailImageKey]);

  async function uploadFiles(files: FileList | null) {
    setError(null);
    if (!files?.length) return;

    const form = new FormData();
    form.set("visibility", type === "feed" ? "public" : visibility);
    for (const file of Array.from(files)) {
      form.append("files", file);
    }

    const response = await fetch("/api/images", { method: "POST", body: form });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        details?: string;
      } | null;
      setError(payload?.details ?? payload?.error ?? "업로드에 실패했어요.");
      return;
    }

    const payload = (await response.json()) as { keys: string[] };
    setImageKeys((prev) => [...prev, ...(payload.keys ?? [])]);
  }

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

    const response = await fetch("/api/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
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
        ...(type === "diary" && !initial?.id && createdAtYmd
          ? { createdAtYmd }
          : null),
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(payload?.error ?? "글 저장에 실패했어요.");
      return;
    }

    const created = (await response.json()) as { slug: string; type: PostType };
    startTransition(() => {
      if (created.type === "blog") router.push(`/article/${created.slug}`);
      else if (created.type === "feed") router.push(`/feed`);
      else router.push(`/diary/${created.slug}`);
      router.refresh();
    });
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-black text-foreground">
            {typeLabel(type)} {initial ? "수정" : "글쓰기"}
          </span>
          {type === "diary" && !initial && createdAtYmd ? (
            <span className="text-xs font-semibold text-muted">
              작성 날짜: {createdAtYmd.replaceAll("-", ".")}
            </span>
          ) : null}
          <span className="text-xs text-muted">
            {isPending ? "저장 중..." : "임시"}
          </span>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="h-9 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110 disabled:opacity-50"
        >
          {initial ? "저장" : "발행"}
        </button>
      </div>

      <div className="border-b border-border bg-background p-6">
        <div className="rounded-2xl border border-border bg-surface px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {type === "blog" ? (
              <>
                <div className="flex min-w-[220px] items-center gap-2">
                  <select
                    value={categorySlug}
                    onChange={(e) => setCategorySlug(e.target.value)}
                    className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground outline-none transition focus:border-primary/60"
                    aria-label="카테고리 선택"
                  >
                    <option value="">카테고리 선택</option>
                    {categoryOptions.map((slug) => (
                      <option key={slug} value={slug}>
                        {slug}
                        {categories.includes(slug) ? "" : " (삭제됨)"}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void refreshCategories()}
                    className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-background text-sm font-black text-foreground transition hover:border-primary/30 disabled:opacity-50"
                    disabled={categoriesLoading}
                    title="카테고리 새로고침"
                    aria-label="카테고리 새로고침"
                  >
                    ↻
                  </button>
                </div>
                <div className="h-6 w-px bg-border" aria-hidden />
              </>
            ) : null}

            <VisibilitySegmented
              value={type === "feed" ? "public" : visibility}
              onChange={(next) => setVisibility(next)}
              disabled={type === "feed"}
            />

            <div className="h-6 w-px bg-border" aria-hidden />

            <label
              htmlFor={fileInputId}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground transition hover:border-primary/30"
            >
              <svg
                className="size-4 text-muted"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.7}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 7a2 2 0 0 1 2-2h2l1-1h6l1 1h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 14l2-2 2 2 3-3 3 3"
                />
              </svg>
              이미지 첨부
              {imageKeys.length ? (
                <span className="rounded-lg bg-surface-2 px-2 py-1 text-xs font-black text-muted">
                  {imageKeys.length}
                </span>
              ) : null}
            </label>
            <input
              id={fileInputId}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void uploadFiles(e.target.files)}
            />
          </div>

          {type === "blog" && imageKeys.length ? (
            <div className="mt-3">
              <label className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2 text-sm">
                <span className="text-xs font-bold text-muted">썸네일</span>
                <select
                  value={thumbnailImageKey}
                  onChange={(e) => setThumbnailImageKey(e.target.value)}
                  className="h-9 rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground outline-none transition focus:border-primary/60"
                >
                  <option value="">자동</option>
                  {imageKeys.map((key, idx) => (
                    <option key={key} value={key}>
                      이미지 {idx + 1}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          {imageKeys.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {imageKeys.map((key, idx) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => removeImageKey(key)}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground transition hover:border-primary/30"
                  title="클릭해서 제거"
                >
                  <span className="text-muted">이미지 {idx + 1}</span>
                  <span className="text-muted/80">×</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}
      </div>

      <div className="grid min-h-[720px] gap-0 lg:grid-cols-2">
        <div className="min-w-0 bg-background">
          <div className="border-b border-border px-7 py-4">
            <p className="text-lg font-black tracking-tight text-foreground">
              제목
            </p>
          </div>
          <div className="border-b border-border px-7 py-5">
            {type === "feed" ? (
              <p className="text-sm font-semibold text-muted">
                제목은 본문으로 자동 생성돼요.
              </p>
            ) : (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border-0 bg-transparent px-0 text-2xl font-black tracking-tight text-foreground placeholder:text-muted outline-none"
                placeholder="제목을 입력해주세요"
              />
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[520px] w-full resize-none bg-transparent p-7 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted"
            placeholder="내용을 입력해주세요..."
            spellCheck={false}
          />
        </div>

        <div className="min-w-0 border-t border-border bg-background lg:border-l lg:border-t-0">
          <div className="border-b border-border px-7 py-4">
            <p className="text-sm font-semibold text-muted">미리보기</p>
          </div>
          <div className="min-h-[520px] overflow-auto p-7">
            {content.trim() ? (
              <MarkdownClient content={content} />
            ) : (
              <p className="text-sm text-muted">
                내용을 입력하면 미리보기가 표시돼요.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
