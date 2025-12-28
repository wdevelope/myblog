"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PostType, Visibility } from "@/lib/types";

type UploadResult = {
  key: string;
  uploadUrl: string;
  url: string | null;
  downloadUrl: string | null;
};

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
  const [imageKeys, setImageKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const effectiveSlug = useMemo(() => slug.trim() || slugify(title), [slug, title]);

  async function uploadFiles(files: FileList | null) {
    setError(null);
    if (!files?.length) return;

    for (const file of Array.from(files)) {
      const metaRes = await fetch("/api/uploads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentType: file.type, visibility }),
      });
      if (!metaRes.ok) {
        const payload = (await metaRes.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(payload?.error ?? "Failed to start upload");
        return;
      }

      const meta = (await metaRes.json()) as UploadResult;
      const putRes = await fetch(meta.uploadUrl, {
        method: "PUT",
        body: file,
      });
      if (!putRes.ok) {
        setError("Failed to upload file");
        return;
      }

      setImageKeys((prev) => [...prev, meta.key]);
    }
  }

  async function submit() {
    setError(null);
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) return setError("title is required");
    if (!trimmedContent) return setError("content is required");
    if (type === "blog" && !categorySlug.trim()) {
      return setError("categorySlug is required for blog posts");
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
      setError(payload?.error ?? "Failed to save post");
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
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as PostType)}
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 outline-none dark:border-white/10 dark:bg-zinc-950"
          >
            <option value="blog">blog</option>
            <option value="feed">feed</option>
            <option value="diary">diary</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Visibility</span>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 outline-none dark:border-white/10 dark:bg-zinc-950"
          >
            <option value="public">public</option>
            <option value="private">private</option>
          </select>
        </label>
      </div>

      <label className="space-y-1 text-sm">
        <span className="font-medium">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 outline-none dark:border-white/10 dark:bg-zinc-950"
          placeholder="Post title"
        />
      </label>

      <label className="space-y-1 text-sm">
        <span className="font-medium">Slug (optional)</span>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 outline-none dark:border-white/10 dark:bg-zinc-950"
          placeholder={slugify(title) || "auto-generated"}
        />
      </label>

      {type === "blog" ? (
        <label className="space-y-1 text-sm">
          <span className="font-medium">Category slug</span>
          <input
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 outline-none dark:border-white/10 dark:bg-zinc-950"
            placeholder="e.g. dev, life, notes"
          />
        </label>
      ) : null}

      <label className="space-y-1 text-sm">
        <span className="font-medium">Content</span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 outline-none dark:border-white/10 dark:bg-zinc-950"
          placeholder="Write something…"
        />
      </label>

      <label className="space-y-1 text-sm">
        <span className="font-medium">Images</span>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => void uploadFiles(e.target.files)}
        />
        {imageKeys.length ? (
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Attached: {imageKeys.length}
          </p>
        ) : null}
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="button"
        onClick={submit}
        disabled={isPending}
        className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        Publish
      </button>
    </div>
  );
}

