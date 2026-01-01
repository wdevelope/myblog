"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PostType, Visibility } from "@/lib/types";
import { toAutoTitle } from "@/lib/markdown";

function imageSrcFromImageKey(key: string) {
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

function typeLabel(type: PostType) {
  if (type === "blog") return "아티클";
  if (type === "feed") return "피드";
  return "다이어리";
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function highlightMarkdown(input: string) {
  const lines = input.split("\n");
  let inFence = false;

  const out = lines.map((rawLine) => {
    const line = escapeHtml(rawLine);

    if (/^\s*```/.test(rawLine)) {
      inFence = !inFence;
      return `<span class="text-muted">\`\`\`</span>${line.replace(/^\s*```/, "")}`;
    }

    if (inFence) {
      return `<span class="text-emerald-700/80 dark:text-emerald-400/80">${line || "&nbsp;"}</span>`;
    }

    let html = line;

    // headings: ## ...
    html = html.replace(
      /^(#{1,6})(\s+)/,
      '<span class="text-primary/80 font-bold">$1</span>$2',
    );
    // blockquote: > ...
    html = html.replace(
      /^(\s*&gt;)(\s*)/,
      '<span class="text-muted font-bold">$1</span>$2',
    );
    // lists: - / * / 1.
    html = html.replace(
      /^(\s*(?:[-*+]|\\d+\\.))(\s+)/,
      '<span class="text-muted font-bold">$1</span>$2',
    );
    // inline code markers `
    html = html.replace(/`/g, '<span class="text-primary/80 font-bold">`</span>');
    // emphasis markers
    html = html.replace(/\*\*/g, '<span class="text-primary/80 font-bold">**</span>');
    html = html.replace(/~~/g, '<span class="text-primary/80 font-bold">~~</span>');

    return html || "&nbsp;";
  });

  return out.join("\n");
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
  const [imageKeys, setImageKeys] = useState<string[]>(initial?.imageKeys ?? []);
  const [thumbnailImageKey, setThumbnailImageKey] = useState<string>(
    initial?.thumbnailImageKey?.trim() ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const highlightRef = useRef<HTMLPreElement | null>(null);

  const removeImageKey = useCallback(
    (key: string) => {
      setImageKeys((prev) => prev.filter((k) => k !== key));
      setThumbnailImageKey((prev) => (prev === key ? "" : prev));
    },
    [setImageKeys, setThumbnailImageKey],
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
        categories: Array<{ slug: string } | { slug: string; inUse?: number }>;
      };
      const slugs = (payload.categories ?? [])
        .map((c) => c.slug)
        .filter((v): v is string => typeof v === "string" && v.trim().length > 0);
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

  const applyMarkdown = useCallback(
    (prefix: string, suffix = "") => {
      const el = textareaRef.current;
      if (!el) return;

      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      const value = el.value ?? "";
      const selected = value.slice(start, end);

      const nextValue =
        value.slice(0, start) + prefix + selected + suffix + value.slice(end);
      const selectionStart = start + prefix.length;
      const selectionEnd = selectionStart + selected.length;

      setContent(nextValue);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(selectionStart, selectionEnd);
      });
    },
    [setContent]
  );

  const insertLinePrefix = useCallback(
    (linePrefix: string) => applyMarkdown(`${linePrefix}`),
    [applyMarkdown]
  );

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
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; details?: string }
        | null;
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
    if (type !== "feed" && !trimmedTitle) return setError("제목을 입력해주세요.");

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
          type === "blog" ? (thumbnailImageKey.trim() || null) : null,
        ...(type === "diary" && !initial?.id && createdAtYmd
          ? { createdAtYmd }
          : null),
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
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
      <div className="flex items-center justify-between border-b border-border px-7 py-5">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-muted">
            {typeLabel(type)} 글쓰기
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="h-9 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110 disabled:opacity-50"
          >
            {initial ? "저장" : "발행"}
          </button>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-border bg-background p-6 lg:sticky lg:top-20 lg:h-[calc(100dvh-7.5rem)] lg:overflow-auto lg:border-b-0 lg:border-r">
          <div className="space-y-5">
            <div className="grid gap-3">
              {type !== "feed" ? (
                <label className="space-y-1 text-sm">
                  <span className="font-semibold text-foreground">공개 범위</span>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as Visibility)}
                    className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary/60"
                  >
                    <option value="public">공개</option>
                    <option value="private">비공개</option>
                  </select>
                </label>
              ) : null}

              {type === "blog" ? (
                <label className="space-y-1 text-sm">
                  <span className="font-semibold text-foreground">카테고리</span>
                  <div className="flex w-full items-center gap-2">
                    <select
                      value={categorySlug}
                      onChange={(e) => setCategorySlug(e.target.value)}
                      className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary/60"
                    >
                      <option value="">카테고리를 선택해주세요</option>
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
                      className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-sm font-bold text-foreground transition hover:bg-surface-2 disabled:opacity-50"
                      disabled={categoriesLoading}
                      title="카테고리 새로고침"
                      aria-label="카테고리 새로고침"
                    >
                      ↻
                    </button>
                  </div>
                  {!categoriesLoading && categories.length === 0 ? (
                    <p className="text-xs text-muted">
                      먼저 아티클 페이지에서 카테고리를 생성해주세요.
                    </p>
                  ) : null}
                </label>
              ) : null}

              <label className="space-y-1 text-sm">
                <span className="font-semibold text-foreground">이미지</span>
                <div className="rounded-2xl border-2 border-dashed border-border bg-surface-2 p-4">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => void uploadFiles(e.target.files)}
                    className="block w-full text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-surface file:px-3 file:py-2 file:text-sm file:font-bold file:text-foreground"
                  />
                  {imageKeys.length ? (
                    <p className="mt-2 text-xs text-muted">
                      첨부됨: {imageKeys.length}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-muted">
                      클릭해서 이미지를 업로드하세요
                    </p>
                  )}
                </div>
                {imageKeys.length ? (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {imageKeys.map((key) => {
                      const src = imageSrcFromImageKey(key);
                      return (
                        <div
                          key={key}
                          className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-border"
                        >
                          {src ? (
                            <img
                              src={src}
                              alt=""
                              className="absolute inset-0 h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-surface-2" />
                          )}
                          <button
                            type="button"
                            onClick={() => removeImageKey(key)}
                            className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-full bg-black/45 text-xs font-black text-white transition hover:bg-black/60"
                            aria-label="이미지 제거"
                            title="이미지 제거"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </label>

              {type === "blog" && imageKeys.length ? (
                <label className="space-y-1 text-sm">
                  <span className="font-semibold text-foreground">
                    썸네일 이미지
                  </span>
                  <select
                    value={thumbnailImageKey}
                    onChange={(e) => setThumbnailImageKey(e.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary/60"
                  >
                    <option value="">자동(첫 번째 이미지)</option>
                    {imageKeys.map((key, idx) => (
                      <option key={key} value={key}>
                        이미지 {idx + 1}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            {error ? <p className="text-sm text-red-500">{error}</p> : null}
          </div>
        </aside>

        <main className="min-w-0 bg-surface">
          <div className="border-b border-border bg-surface px-7 py-5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1 rounded-2xl border border-border bg-surface-2 p-1">
                <button
                  type="button"
                  onClick={() => insertLinePrefix("# ")}
                  className="h-9 rounded-xl px-3 text-sm font-bold text-foreground/80 transition hover:bg-surface hover:text-foreground"
                  aria-label="제목 1"
                  title="제목 1"
                >
                  H1
                </button>
                <button
                  type="button"
                  onClick={() => insertLinePrefix("## ")}
                  className="h-9 rounded-xl px-3 text-sm font-bold text-foreground/80 transition hover:bg-surface hover:text-foreground"
                  aria-label="제목 2"
                  title="제목 2"
                >
                  H2
                </button>
              </div>

              <div className="h-6 w-px bg-border" />

              <div className="inline-flex items-center gap-1 rounded-2xl border border-border bg-surface-2 p-1">
                <button
                  type="button"
                  onClick={() => applyMarkdown("**", "**")}
                  className="h-9 rounded-xl px-3 text-sm font-black text-foreground/80 transition hover:bg-surface hover:text-foreground"
                  aria-label="굵게"
                  title="굵게"
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => applyMarkdown("*", "*")}
                  className="h-9 rounded-xl px-3 text-sm font-black italic text-foreground/80 transition hover:bg-surface hover:text-foreground"
                  aria-label="기울임"
                  title="기울임"
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => applyMarkdown("~~", "~~")}
                  className="h-9 rounded-xl px-3 text-sm font-black text-foreground/80 transition hover:bg-surface hover:text-foreground"
                  aria-label="취소선"
                  title="취소선"
                >
                  S
                </button>
              </div>

              <div className="h-6 w-px bg-border" />

              <div className="inline-flex items-center gap-1 rounded-2xl border border-border bg-surface-2 p-1">
                <button
                  type="button"
                  onClick={() => insertLinePrefix("- ")}
                  className="h-9 rounded-xl px-3 text-sm font-bold text-foreground/80 transition hover:bg-surface hover:text-foreground"
                  aria-label="불릿 리스트"
                  title="불릿 리스트"
                >
                  •
                </button>
                <button
                  type="button"
                  onClick={() => insertLinePrefix("1. ")}
                  className="h-9 rounded-xl px-3 text-sm font-bold text-foreground/80 transition hover:bg-surface hover:text-foreground"
                  aria-label="번호 리스트"
                  title="번호 리스트"
                >
                  1.
                </button>
                <button
                  type="button"
                  onClick={() => insertLinePrefix("> ")}
                  className="h-9 rounded-xl px-3 text-sm font-bold text-foreground/80 transition hover:bg-surface hover:text-foreground"
                  aria-label="인용"
                  title="인용"
                >
                  &quot;
                </button>
              </div>

              <div className="h-6 w-px bg-border" />

              <div className="inline-flex items-center gap-1 rounded-2xl border border-border bg-surface-2 p-1">
                <button
                  type="button"
                  onClick={() => applyMarkdown("`", "`")}
                  className="h-9 rounded-xl px-3 text-sm font-bold text-foreground/80 transition hover:bg-surface hover:text-foreground"
                  aria-label="인라인 코드"
                  title="인라인 코드"
                >
                  {"</>"}
                </button>
                <button
                  type="button"
                  onClick={() => applyMarkdown("\n```\n", "\n```\n")}
                  className="h-9 rounded-xl px-3 text-sm font-bold text-foreground/80 transition hover:bg-surface hover:text-foreground"
                  aria-label="코드 블록"
                  title="코드 블록"
                >
                  {"```"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const url = window.prompt("링크 URL을 입력하세요");
                    if (!url) return;
                    applyMarkdown("[", `](${url})`);
                  }}
                  className="h-9 rounded-xl px-3 text-sm font-bold text-foreground/80 transition hover:bg-surface hover:text-foreground"
                  aria-label="링크"
                  title="링크"
                >
                  ⛓
                </button>
              </div>
            </div>
          </div>

          {type === "feed" ? (
            <div className="border-b border-border px-7 py-4">
              <p className="text-sm font-semibold text-muted">
                제목은 본문으로 자동 생성돼요.
              </p>
            </div>
          ) : (
            <div className="border-b border-border px-7 py-6">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border-0 bg-transparent px-0 text-3xl font-black tracking-tight text-foreground placeholder:text-muted outline-none"
                placeholder="제목"
              />
            </div>
          )}

          <div className="relative">
            <pre
              ref={highlightRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0 min-h-[540px] w-full overflow-auto whitespace-pre-wrap break-words p-7 font-mono text-sm leading-relaxed text-foreground"
              dangerouslySetInnerHTML={{ __html: highlightMarkdown(content) }}
            />
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="relative z-10 min-h-[540px] w-full resize-none bg-transparent p-7 font-mono text-sm leading-relaxed text-transparent caret-foreground outline-none placeholder:text-muted"
              placeholder="내용을 입력하세요..."
              spellCheck={false}
              onScroll={(e) => {
                const target = e.currentTarget;
                if (highlightRef.current) {
                  highlightRef.current.scrollTop = target.scrollTop;
                  highlightRef.current.scrollLeft = target.scrollLeft;
                }
              }}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
