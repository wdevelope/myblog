import Image from "next/image";
import type { Visibility } from "@/lib/types";
import { formatPostDate } from "@/lib/utils";
import VisibilityIcon from "@/app/_components/VisibilityIcon";

// 글 상세 머리의 작성자·날짜 줄. 조회수는 아티클만 브라우저에서 세므로 쓰는 곳이 넘긴다.
export default function PostMeta({
  createdAt,
  visibility,
  views,
}: {
  createdAt?: string;
  visibility?: Visibility;
  views: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4">
      <Image
        src="/logo.png"
        alt="프로필"
        width={40}
        height={40}
        className="size-10 rounded-full object-cover ring-1 ring-border"
      />
      <div className="space-y-1">
        <p className="text-sm font-bold text-foreground">오웬</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>{createdAt ? formatPostDate(createdAt, "ko") : ""}</span>
          <span>·</span>
          <span>{views}</span>
          <span>·</span>
          <span className="flex items-center gap-1.5 font-medium group">
            <VisibilityIcon visibility={visibility === "private" ? "private" : "public"} className="size-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}
