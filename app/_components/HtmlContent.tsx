"use client";

import "ckeditor5/ckeditor5.css";
import { cn } from "@/lib/utils";

// This component is responsible for rendering HTML content created by CKEditor.
// It applies necessary styles to match the WYSIWYG look.

export default function HtmlContent({
  content,
  isFeed = false,
  className,
}: {
  content: string;
  isFeed?: boolean;
  className?: string;
}) {
  return (
    <>
      <div
        className={cn(
          "prose max-w-none wrap-break-word",
          "dark:prose-invert",
          "ck-content",
          isFeed ? "prose-sm" : "prose-base md:prose-lg",
          className
        )}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </>
  );
}
