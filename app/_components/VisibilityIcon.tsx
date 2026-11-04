import { Globe, Lock } from "lucide-react";
import type { Visibility } from "@/lib/types";
import { cn } from "@/lib/utils";

// 글·카테고리의 공개 범위 표시. 색은 공개 범위가 정하고 크기는 쓰는 곳이 정한다.
export default function VisibilityIcon({
  visibility,
  className,
}: {
  visibility: Visibility;
  className?: string;
}) {
  const Icon = visibility === "private" ? Lock : Globe;
  return (
    <Icon
      role="img"
      aria-label={visibility === "private" ? "비공개" : "공개"}
      className={cn(visibility === "private" ? "text-warning" : "text-success", className)}
    />
  );
}
