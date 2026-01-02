"use client";

import { useEffect, useState } from "react";
import "ckeditor5/ckeditor5.css";

// This component is responsible for rendering HTML content created by CKEditor.
// It applies necessary styles to match the WYSIWYG look.

export default function HtmlContent({ content }: { content: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // SSR safe, or just render without client-specific adjustments?
    // For dangerous HTML, it's consistent.
    return (
      <div
        className="ck-content prose prose-sm md:prose-base dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return (
    <div
      className="ck-content prose prose-sm md:prose-base dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
