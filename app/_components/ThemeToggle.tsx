"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch by only rendering after mounting
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-full border border-border/40 bg-surface/50 opacity-0" />
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
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
