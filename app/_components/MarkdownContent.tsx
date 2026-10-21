import "katex/dist/katex.min.css";
import { renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";

// 마크다운 본문. 글 화면(서버)과 에디터 미리보기(클라이언트)가 같은 렌더러를 쓴다.
// renderMarkdown은 본문의 HTML을 글자로 내보내므로 결과를 그대로 넣어도 된다.
export default function MarkdownContent({
  content,
  compact = false,
  className,
}: {
  content: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "markdown-body prose max-w-none wrap-break-word dark:prose-invert",
        compact ? "prose-sm" : "prose-base md:prose-lg",
        className
      )}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}
