"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastVariant = "default" | "success" | "error";

type Toast = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastOptions = {
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastContextValue = {
  toast: (options: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function toastClasses(variant: ToastVariant) {
  if (variant === "success") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
  }
  if (variant === "error") {
    return "border-red-500/25 bg-red-500/10 text-red-200";
  }
  return "border-border bg-surface text-foreground";
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    ({ message, durationMs = 2800, variant = "default" }: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
      const timer = window.setTimeout(() => remove(id), durationMs);
      timers.current.set(id, timer);
    },
    [remove],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed top-20 right-4 z-[100] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2"
        role="region"
        aria-label="알림"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              "flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 shadow-lg shadow-black/20 backdrop-blur",
              toastClasses(t.variant),
            ].join(" ")}
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-semibold leading-6">{t.message}</p>
            <button
              type="button"
              onClick={() => remove(t.id)}
              className="mt-0.5 inline-flex size-7 items-center justify-center rounded-xl border border-border/60 bg-transparent text-xs text-muted hover:bg-surface-2 hover:text-foreground"
              aria-label="닫기"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider />");
  return ctx;
}

