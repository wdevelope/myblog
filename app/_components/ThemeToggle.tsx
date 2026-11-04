"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();

  // 아이콘은 dark: 클래스로 바뀌고 테마 값은 클릭할 때만 읽어, 서버 HTML과 어긋나지 않아 마운트를 기다리지 않는다.
  // theme는 시스템 설정이면 "system"이라 실제로 보이는 값인 resolvedTheme을 본다.
  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="relative w-10 h-10 flex items-center justify-center rounded-full border border-border/40 bg-surface/50 hover:bg-surface-2 transition-all duration-300 group overflow-hidden"
      aria-label="테마 변경"
    >
      <div className="relative w-5 h-5">
        <Sun className="absolute inset-0 h-full w-full rotate-0 scale-100 transition-all duration-500 dark:-rotate-90 dark:scale-0 text-amber-500 fill-amber-500/20" />
        <Moon className="absolute inset-0 h-full w-full rotate-90 scale-0 transition-all duration-500 dark:rotate-0 dark:scale-100 text-indigo-400 fill-indigo-400/20" />
      </div>
      
      {/* Subtle hover effect */}
      <span className="absolute inset-0 rounded-full bg-primary/5 scale-0 group-hover:scale-100 transition-transform duration-300" />
    </button>
  );
}
