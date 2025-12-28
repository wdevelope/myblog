"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PostType, Visibility } from "@/lib/types";
import MarkdownClient from "@/app/_components/MarkdownClient";

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s-]/g, "")
    .replaceAll(/\s+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-|-$/g, "");
}

export default function AdminEditor() {
  const router = useRouter();
  const [type, setType] = useState<PostType>("blog");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [imageKeys, setImageKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const effectiveSlug = useMemo(() => slug.trim() || slugify(title), [slug, title]);

  async function uploadFiles(files: FileList | null) {
    setError(null);
    if (!files?.length) return;

    const form = new FormData();
    form.set("visibility", visibility);
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
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) return setError("제목을 입력해주세요.");
    if (!trimmedContent) return setError("내용을 입력해주세요.");
    if (type === "blog" && !categorySlug.trim()) {
      return setError("블로그 글은 카테고리가 필요해요.");
    }

    const response = await fetch("/api/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type,
        visibility,
        title: trimmedTitle,
        slug: effectiveSlug || undefined,
        content: trimmedContent,
        categorySlug: type === "blog" ? categorySlug.trim() : null,
        imageKeys,
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
      if (created.type === "blog") router.push(`/blog/${created.slug}`);
      else if (created.type === "feed") router.push(`/feed/${created.slug}`);
      else router.push(`/diary/${created.slug}`);
      router.refresh();
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-muted">에디터</span>
          <span className="text-xs text-muted">
            {isPending ? "저장 중..." : "임시"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className="h-9 rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-foreground hover:bg-surface-2"
          >
            {preview ? "편집" : "미리보기"}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="h-9 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110 disabled:opacity-50"
          >
            발행
          </button>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-border bg-background p-5 lg:border-b-0 lg:border-r">
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">
                글 종류
              </p>
              <div className="grid gap-2">
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="content_type"
                    className="sr-only"
                    checked={type === "blog"}
                    onChange={() => setType("blog")}
                  />
                  <div className="rounded-xl border border-border bg-surface px-3 py-3 text-sm font-semibold text-foreground hover:bg-surface-2">
                    블로그 글
                  </div>
                </label>
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="content_type"
                    className="sr-only"
                    checked={type === "feed"}
                    onChange={() => setType("feed")}
                  />
                  <div className="rounded-xl border border-border bg-surface px-3 py-3 text-sm font-semibold text-foreground hover:bg-surface-2">
                    피드 글
                  </div>
                </label>
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="content_type"
                    className="sr-only"
                    checked={type === "diary"}
                    onChange={() => setType("diary")}
                  />
                  <div className="rounded-xl border border-border bg-surface px-3 py-3 text-sm font-semibold text-foreground hover:bg-surface-2">
                    일기
                  </div>
                </label>
              </div>
            </div>

            <div className="grid gap-3">
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

              {type === "blog" ? (
                <label className="space-y-1 text-sm">
                  <span className="font-semibold text-foreground">카테고리</span>
                  <input
                    value={categorySlug}
                    onChange={(e) => setCategorySlug(e.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary/60"
                    placeholder="예: frontend, backend"
                  />
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
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">
                슬러그
              </p>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary/60"
                placeholder={slugify(title) || "자동 생성"}
              />
              <p className="text-xs text-muted">
                적용값:{" "}
                <span className="font-mono text-foreground">
                  {effectiveSlug || "-"}
                </span>
              </p>
            </div>

            {error ? <p className="text-sm text-red-500">{error}</p> : null}
          </div>
        </aside>

        <main className="min-w-0 bg-[#0f1115]">
          <div className="border-b border-border px-6 py-5">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border-0 bg-transparent px-0 text-3xl font-black tracking-tight text-white placeholder:text-white/40 outline-none"
              placeholder="제목"
            />
          </div>

          <div className="grid min-h-[520px] gap-0 lg:grid-cols-2">
            <section className="border-b border-border lg:border-b-0 lg:border-r">
              {preview ? (
                <div className="h-full overflow-auto p-6 text-white">
                  <MarkdownClient content={content || " "} />
                </div>
              ) : (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="h-full w-full resize-none bg-transparent p-6 font-mono text-sm leading-relaxed text-[#d4d4d4] outline-none"
                  placeholder="내용을 입력하세요..."
                  spellCheck={false}
                />
              )}
            </section>
            <section className="hidden overflow-auto p-6 lg:block">
              <div className="rounded-2xl border border-border bg-surface p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">
                  미리보기
                </p>
                <div className="mt-4">
                  <MarkdownClient content={content || " "} />
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
