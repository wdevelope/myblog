"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Settings, X } from "lucide-react";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategory,
  type Category,
} from "@/lib/actions/categories";
import VisibilityIcon from "@/app/_components/VisibilityIcon";
import { cn } from "@/lib/utils";

export default function CategorySettingsModal() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const [newSlug, setNewSlug] = useState("");
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const moveTargets = useMemo(() => {
    if (!pendingDelete) return [];
    return categories
      .filter((c) => c.slug !== pendingDelete)
      .map((c) => c.slug);
  }, [categories, pendingDelete]);

  async function refreshList() {
    setLoading(true);
    try {
      const result = await getCategories();
      if (!result.success) {
        toast.error("카테고리 목록을 불러오지 못했어요.");
        return;
      }
      const list = Array.isArray(result.categories) ? result.categories : [];
      setCategories(list);
    } finally {
      setLoading(false);
    }
  }

  async function open() {
    dialogRef.current?.showModal();
    await refreshList();
  }

  // 이름 변경과 삭제 확인은 한 번에 한 행에서만 열린다.
  function resetEditState() {
    setEditingSlug(null);
    setPendingDelete(null);
  }

  function close() {
    dialogRef.current?.close();
  }

  // 아티클 목록의 카테고리 사이드바는 서버 컴포넌트라 모달 목록과 함께 새로 그려야 한다.
  // sonner는 loading·success가 없으면 그 토스트를 띄우지 않으므로 messages 없이 부르면 실패만 알린다.
  function run(
    action: () => Promise<void>,
    messages: { loading?: string; success?: string } = {}
  ) {
    const promise = (async () => {
      await action();
      await refreshList();
      router.refresh();
    })();

    toast.promise(promise, {
      ...messages,
      error: (err: Error) => err.message,
    });
  }

  function onCreate() {
    const slug = newSlug.trim();
    if (!slug) {
      toast.error("카테고리 이름을 입력해주세요.");
      return;
    }

    run(
      async () => {
        const result = await createCategory(slug);
        if (!result.success) {
          if (result.error === "conflict") {
            throw new Error("이미 존재하는 카테고리예요.");
          }
          throw new Error(result.error ?? "카테고리 생성에 실패했어요.");
        }
        setNewSlug("");
      },
      { loading: "카테고리 생성 중...", success: "카테고리 생성 완료" }
    );
  }

  function onMove(slug: string, direction: "up" | "down") {
    run(async () => {
      const result = await reorderCategory(slug, direction);
      if (!result.success) {
        throw new Error("카테고리 순서 변경에 실패했어요.");
      }
    });
  }

  function onChangeVisibility(slug: string, visibility: "public" | "private") {
    run(async () => {
      const result = await updateCategory(slug, { visibility });
      if (!result.success) {
        throw new Error("카테고리 공개 범위 변경에 실패했어요.");
      }
    });
  }

  function startEdit(slug: string) {
    setEditingSlug(slug);
    setPendingDelete(null);
  }

  function onRename(slug: string, value: string) {
    const next = value.trim();
    if (!next) {
      toast.error("새 이름을 입력해주세요.");
      return;
    }

    run(
      async () => {
        const result = await updateCategory(slug, { slug: next });
        if (!result.success) {
          if (result.error === "conflict") {
            throw new Error("이미 존재하는 카테고리예요.");
          }
          throw new Error(result.error ?? "카테고리 이름 변경에 실패했어요.");
        }
        setEditingSlug(null);
      },
      { loading: "이름 변경 중...", success: "카테고리 이름 변경 완료" }
    );
  }

  function requestDelete(slug: string) {
    setPendingDelete(slug);
    setEditingSlug(null);
  }

  function onDelete(category: Category, deleteMoveTo: string) {
    const inUse = category.inUse ?? 0;
    const moveTo = inUse > 0 ? deleteMoveTo : undefined;
    if (inUse > 0 && !deleteMoveTo) {
      toast.error("이동할 카테고리를 선택해주세요.");
      return;
    }

    const ok = window.confirm(
      inUse > 0
        ? `정말 삭제할까요? (${inUse}개 글을 '${deleteMoveTo}'로 이동 후 삭제)`
        : "정말 삭제할까요? 이 작업은 되돌릴 수 없어요."
    );
    if (!ok) return;

    run(
      async () => {
        const result = await deleteCategory(category.slug, moveTo);
        if (!result.success) {
          if (result.error === "in_use") {
            throw new Error("사용 중인 카테고리라서 이동 카테고리가 필요해요.");
          }
          throw new Error(result.error ?? "카테고리 삭제에 실패했어요.");
        }
        setPendingDelete(null);
      },
      { loading: "카테고리 삭제 중...", success: "카테고리 삭제 완료" }
    );
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
        <Settings className="size-4" aria-hidden />
      </button>

      {/* ESC처럼 브라우저가 직접 닫는 경로도 close 이벤트는 거치므로 편집 상태는 여기서 비운다. */}
      <dialog
        ref={dialogRef}
        onClose={resetEditState}
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
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="space-y-6 p-5">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              onCreate();
            }}
          >
            <label className="flex-1 space-y-2">
              <span className="text-xs font-bold text-muted">새 카테고리</span>
              <input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="예) 개발"
                className="h-10 w-full rounded-xl border border-border bg-surface-2 px-3 text-base outline-none focus:border-primary/40 sm:text-sm"
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
                categories.map((c, index) => (
                  <CategoryRow
                    key={c.slug}
                    category={c}
                    canMoveUp={index > 0}
                    canMoveDown={index < categories.length - 1}
                    isEditing={editingSlug === c.slug}
                    isDeleting={pendingDelete === c.slug}
                    moveTargets={moveTargets}
                    onMove={onMove}
                    onChangeVisibility={onChangeVisibility}
                    onStartEdit={startEdit}
                    onRename={onRename}
                    onRequestDelete={requestDelete}
                    onDelete={onDelete}
                    onCancel={resetEditState}
                  />
                ))
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

type CategoryRowProps = {
  category: Category;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isEditing: boolean;
  isDeleting: boolean;
  moveTargets: string[];
  onMove: (slug: string, direction: "up" | "down") => void;
  onChangeVisibility: (slug: string, visibility: "public" | "private") => void;
  onStartEdit: (slug: string) => void;
  onRename: (slug: string, value: string) => void;
  onRequestDelete: (slug: string) => void;
  onDelete: (category: Category, moveTo: string) => void;
  onCancel: () => void;
};

function CategoryRow({
  category,
  canMoveUp,
  canMoveDown,
  isEditing,
  isDeleting,
  moveTargets,
  onMove,
  onChangeVisibility,
  onStartEdit,
  onRename,
  onRequestDelete,
  onDelete,
  onCancel,
}: CategoryRowProps) {
  const [editingValue, setEditingValue] = useState("");
  const [deleteMoveTo, setDeleteMoveTo] = useState("");
  const inUse = category.inUse ?? 0;

  return (
    <div className="bg-surface px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-bold">
              {category.slug}
            </span>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">
              사용 {inUse}
            </span>
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] ring-1",
                category.visibility === "public"
                  ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 ring-amber-500/20",
              )}
              title={category.visibility === "public" ? "공개" : "비공개"}
            >
              <VisibilityIcon visibility={category.visibility} className="size-3.5" />
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isEditing && !isDeleting ? (
            <>
              <div className="inline-flex items-center overflow-hidden rounded-lg border border-border bg-surface">
                <button
                  type="button"
                  onClick={() => onMove(category.slug, "up")}
                  disabled={!canMoveUp}
                  className="px-2 py-1.5 text-xs font-bold text-foreground transition hover:bg-surface-2 disabled:opacity-40"
                  aria-label="위로"
                  title="위로"
                >
                  ↑
                </button>
                <div className="h-7 w-px bg-border" />
                <button
                  type="button"
                  onClick={() => onMove(category.slug, "down")}
                  disabled={!canMoveDown}
                  className="px-2 py-1.5 text-xs font-bold text-foreground transition hover:bg-surface-2 disabled:opacity-40"
                  aria-label="아래로"
                  title="아래로"
                >
                  ↓
                </button>
              </div>
              <select
                value={category.visibility}
                onChange={(e) =>
                  onChangeVisibility(
                    category.slug,
                    e.target.value as "public" | "private"
                  )
                }
                className="h-8 rounded-lg border border-border bg-surface px-2 text-base font-bold outline-none focus:border-primary/40 sm:text-xs"
                aria-label="공개 범위"
                title="공개 범위"
              >
                <option value="public">공개</option>
                <option value="private">비공개</option>
              </select>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setEditingValue(category.slug);
              onStartEdit(category.slug);
            }}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-bold transition hover:bg-surface-2"
          >
            이름 변경
          </button>
          <button
            type="button"
            onClick={() => {
              setDeleteMoveTo("");
              onRequestDelete(category.slug);
            }}
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
            onRename(category.slug, editingValue);
          }}
        >
          <label className="flex-1 space-y-2">
            <span className="text-xs font-bold text-muted">
              새 이름
            </span>
            <input
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-surface-2 px-3 text-base outline-none focus:border-primary/40 sm:text-sm"
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
              onClick={onCancel}
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
                className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-base outline-none focus:border-primary/40 sm:text-sm"
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
              onClick={() => onDelete(category, deleteMoveTo)}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700"
            >
              삭제 확정
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-bold transition hover:bg-surface-2"
            >
              취소
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
