import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownExcerpt({ content }: { content: string }) {
  if (!content.trim()) return null;

  return (
    <div className="markdown markdown-muted">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="line-clamp-3 text-sm leading-6 text-muted">
              {children}
            </p>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
