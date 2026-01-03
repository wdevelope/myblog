"use client";

import "ckeditor5/ckeditor5.css";

// This component is responsible for rendering HTML content created by CKEditor.
// It applies necessary styles to match the WYSIWYG look.

export default function HtmlContent({ content }: { content: string }) {
  return (
    <>
      <div
        className="html-content ck-content prose prose-lg dark:prose-invert max-w-none text-gray-900 marker:text-gray-900 prose-headings:text-gray-900 prose-strong:text-gray-900"
        dangerouslySetInnerHTML={{ __html: content }}
      />
      <style jsx global>{`
        .html-content p {
          margin-top: 0;
          margin-bottom: 0;
          line-height: 1.6;
        }
        .html-content ol > li::marker,
        .html-content ul > li::marker {
          color: inherit;
        }
        .html-content ul,
        .html-content ol {
          margin-top: 0.6rem;
          margin-bottom: 0.6rem;
        }
        .html-content li {
          margin-top: 0;
          margin-bottom: 0;
          line-height: 1.6;
        }
      `}</style>
    </>
  );
}
