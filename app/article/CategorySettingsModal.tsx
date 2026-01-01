"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FiSettings, FiX } from "react-icons/fi";

type Category = { slug: string; inUse?: number };

export default function CategorySettingsModal() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const [newSlug, setNewSlug] = useState("");
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleteMoveTo, setDeleteMoveTo] = useState<string>("");

  const categoriesMap = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) map.set(c.slug, c);
    return map;
  }, [categories]);

  const moveTargets = useMemo(() => {
    if (!pendingDelete) return [];
    return categories.filter((c) => c.slug !== pendingDelete).map((c) => c.slug);
  }, [categories, pendingDelete]);

  async function refreshList() {
    setLoading(true);
    try {
      const response = await fetch("/api/categories", { method: "GET" });
      if (!response.ok) {
        toast.error("카테고리 목록을 불러오지 못했어요.");
        return;
      }
      const data = (await response.json()) as { categories: Category[] };
      setCategories(Array.isArray(data.categories) ? data.categories : []);
    } finally {
      setLoading(false);
    }
  }

  async function open() {
    dialogRef.current?.showModal();
    await refreshList();
  }

  function close() {
    dialogRef.current?.close();
    setEditingSlug(null);
    setEditingValue("");
    setPendingDelete(null);
    setDeleteMoveTo("");
  }

  async function onCreate() {
    const slug = newSlug.trim();
    if (!slug) {
      toast.error("카테고리 이름을 입력해주세요.");
      return;
    }

    const response = await fetch("/api/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug }),
    });

    if (response.status === 409) {
      toast.error("이미 존재하는 카테고리예요.");
      return;
    }
    if (!response.ok) {
      toast.error("카테고리 생성에 실패했어요.");
      return;
    }

    toast.success("카테고리 생성 완료");
    setNewSlug("");
    await refreshList();
    router.refresh();
  }

  function startEdit(slug: string) {
    setEditingSlug(slug);
    setEditingValue(slug);
    setPendingDelete(null);
  }

  async function onRename() {
    if (!editingSlug) return;
    const next = editingValue.trim();
    if (!next) {
      toast.error("새 이름을 입력해주세요.");
      return;
    }

    const response = await fetch(`/api/categories/${encodeURIComponent(editingSlug)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: next }),
    });

    if (response.status === 409) {
      toast.error("이미 존재하는 카테고리예요.");
      return;
    }
    if (!response.ok) {
      toast.error("카테고리 이름 변경에 실패했어요.");
      return;
    }

    toast.success("카테고리 이름 변경 완료");
    setEditingSlug(null);
    setEditingValue("");
    await refreshList();
    router.refresh();
  }

  function requestDelete(slug: string) {
    setPendingDelete(slug);
    setDeleteMoveTo("");
    setEditingSlug(null);
    setEditingValue("");
  }

  async function onDelete() {
    if (!pendingDelete) return;

    const inUse = categoriesMap.get(pendingDelete)?.inUse ?? 0;
    const payload = inUse > 0 ? { moveTo: deleteMoveTo } : {};
    if (inUse > 0 && !deleteMoveTo) {
      toast.error("이동할 카테고리를 선택해주세요.");
      return;
    }

    const ok = window.confirm(
      inUse > 0
        ? `정말 삭제할까요? (${inUse}개 글을 '${deleteMoveTo}'로 이동 후 삭제)`
        : "정말 삭제할까요? 이 작업은 되돌릴 수 없어요.",
    );
    if (!ok) return;

    const response = await fetch(`/api/categories/${encodeURIComponent(pendingDelete)}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.status === 409) {
      toast.error("사용 중인 카테고리라서 이동 카테고리가 필요해요.");
      return;
    }
    if (!response.ok) {
      toast.error("카테고리 삭제에 실패했어요.");
      return;
    }

    toast.success("카테고리 삭제 완료");
    setPendingDelete(null);
    setDeleteMoveTo("");
    await refreshList();
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void open()}
        aria-label="카테고리 설정"
        title="카테고리 설정"
        className="inline-flex size-9 items-center justify-center rounded-xl bg-transparent text-muted transition hover:text-foreground"
      >
        <FiSettings className="size-4" aria-hidden />
      </button>

      <dialog
        ref={dialogRef}
        className="fixed left-1/2 top-1/2 max-h-[calc(100dvh-2rem)] w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-3xl border border-border bg-surface p-0 text-foreground shadow-2xl backdrop:bg-black/30"
      >
        <div className="flex items-center justify-between gap-4 border-b border-border p-5">
          <div className="space-y-1">
            <h2 className="text-base font-black">카테고리 관리</h2>
            <p className="text-xs text-muted">생성 / 이름 변경 / 삭제</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="inline-flex size-9 items-center justify-center rounded-xl bg-transparent text-muted transition hover:text-foreground"
            aria-label="닫기"
            title="닫기"
          >
            <FiX className="size-5" aria-hidden />
          </button>
        </div>

        <div className="space-y-6 p-5">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void onCreate();
            }}
          >
            <label className="flex-1 space-y-2">
              <span className="text-xs font-bold text-muted">새 카테고리</span>
              <input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="예) 개발"
                className="h-10 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary/40"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110"
            >
              추가
            </button>
          </form>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black">카테고리 목록</h3>
              <button
                type="button"
                onClick={() => void refreshList()}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-bold transition hover:bg-surface-2"
              >
                새로고침
              </button>
            </div>

            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
              {categories.length ? (
                categories.map((c) => {
                  const inUse = c.inUse ?? 0;
                  const isEditing = editingSlug === c.slug;
                  const isDeleting = pendingDelete === c.slug;

                  return (
                    <div key={c.slug} className="bg-surface px-4 py-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-bold">{c.slug}</span>
                            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">
                              사용 {inUse}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(c.slug)}
                            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-bold transition hover:bg-surface-2"
                          >
                            이름 변경
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDelete(c.slug)}
                            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-500/15"
                          >
                            삭제
                          </button>
                        </div>
                      </div>

                      {isEditing ? (
                        <form
                          className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void onRename();
                          }}
                        >
                          <label className="flex-1 space-y-2">
                            <span className="text-xs font-bold text-muted">새 이름</span>
                            <input
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              className="h-10 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm outline-none focus:border-primary/40"
                              autoFocus
                            />
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110"
                            >
                              저장
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSlug(null)}
                              className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-bold transition hover:bg-surface-2"
                            >
                              취소
                            </button>
                          </div>
                        </form>
                      ) : null}

                      {isDeleting ? (
                        <div className="mt-3 space-y-3 rounded-2xl border border-border bg-surface-2 p-4">
                          {inUse > 0 ? (
                            <label className="space-y-2">
                              <span className="text-xs font-bold text-muted">
                                삭제 전 이동 카테고리
                              </span>
                              <select
                                value={deleteMoveTo}
                                onChange={(e) => setDeleteMoveTo(e.target.value)}
                                className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40"
                              >
                                <option value="">선택해주세요</option>
                                {moveTargets.map((slug) => (
                                  <option key={slug} value={slug}>
                                    {slug}
                                  </option>
                                ))}
                              </select>
                              <p className="text-xs text-muted">
                                현재 {inUse}개 글이 이 카테고리를 사용 중이에요.
                              </p>
                            </label>
                          ) : (
                            <p className="text-xs text-muted">
                              사용 중인 글이 없어서 바로 삭제할 수 있어요.
                            </p>
                          )}

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void onDelete()}
                              className="inline-flex h-10 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700"
                            >
                              삭제 확정
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDelete(null)}
                              className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-bold transition hover:bg-surface-2"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-6 text-center text-sm text-muted">
                  {loading ? "불러오는 중..." : "카테고리가 없어요."}
                </div>
              )}
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
