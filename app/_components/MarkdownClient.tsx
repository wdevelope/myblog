"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { coverSrcFromImageKey } from "@/lib/image";

export default function MarkdownClient({ content }: { content: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ node, ...props }) => {
            const src = props.src as string | undefined;
            if (!src) {
              // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
              return <img {...props} />;
            }
            // Check if src looks like a storage key
            if (
              src.includes(":") &&
              !src.startsWith("http") &&
              !src.startsWith("/")
            ) {
              // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
              return <img {...props} src={coverSrcFromImageKey(src) ?? src} />;
            }
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            return <img {...props} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
