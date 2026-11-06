import "katex/dist/katex.min.css";
import { renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";

// 마크다운 본문. 서버 컴포넌트에서만 쓴다(클라이언트에서 쓰면 markdown-it·KaTeX가 공개 번들에 실린다).
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
        "markdown-body prose max-w-none wrap-break-word",
        compact && "markdown-compact",
        className
      )}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}
