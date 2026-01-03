import { useState, useEffect, useMemo, useRef } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  DecoupledEditor,
  Autosave,
  Essentials,
  Paragraph,
  Table,
  TableToolbar,
  TableColumnResize,
  TableProperties,
  TableCellProperties,
  List,
  ListProperties,
  TableCaption,
  TodoList,
  ImageUtils,
  ImageEditing,
  ImageInline,
  ImageToolbar,
  ImageBlock,
  ImageResize,
  CloudServices,
  Link,
  ImageUpload,
  ImageInsertViaUrl,
  AutoImage,
  ImageStyle,
  LinkImage,
  ImageCaption,
  AutoLink,
  BlockQuote,
  Indent,
  IndentBlock,
  Alignment,
  PlainTableOutput,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  FontBackgroundColor,
  FontColor,
  FontFamily,
  FontSize,
  Highlight,
  Emoji,
  Mention,
  HtmlComment,
  GeneralHtmlSupport,
  Autoformat,
  TextTransformation,
  Heading,
  type EditorConfig,
} from "ckeditor5";

import translations from "ckeditor5/translations/ko.js";
import "ckeditor5/ckeditor5.css";
import { coverSrcFromImageKey } from "@/lib/image";

const LICENSE_KEY = "GPL";

interface CkEditorProps {
  value: string;
  onChange: (data: string) => void;
  placeholder?: string;
  title?: string;
  onTitleChange?: (title: string) => void;
  imageUploadEndpoint?: string; // Optional: defaults to /api/images
}

interface Loader {
  file: Promise<File>;
}

// Custom Upload Adapter for Next.js /api/images
class MyBlogImageUploadAdapter {
  private loader: Loader;

  constructor(loader: Loader) {
    this.loader = loader;
  }

  async upload() {
    const file = await this.loader.file;
    const formData = new FormData();
    // Default visibility to 'public' for content images, or pass it via config if needed.
    // For now, let's assume content images are public.
    formData.append("visibility", "public");
    formData.append("files", file);

    const response = await fetch("/api/images", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("이미지 업로드에 실패했습니다.");
    }

    const data = await response.json();
    const keys = data.keys as string[];
    const key = keys[0];

    // Convert key to URL
    const url = coverSrcFromImageKey(key);

    return {
      default: url ?? key,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  abort() {}
}

export default function CkEditor({
  value,
  onChange,
  placeholder,
  title,
  onTitleChange,
}: CkEditorProps) {
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLayoutReady(true);
    return () => setIsLayoutReady(false);
  }, []);

  const { editorConfig } = useMemo(() => {
    if (!isLayoutReady) {
      return { editorConfig: null };
    }

    return {
      editorConfig: {
        plugins: [
          Alignment,
          Autoformat,
          AutoImage,
          AutoLink,
          Autosave,
          BlockQuote,
          Bold,
          CloudServices,
          Emoji,
          Essentials,
          FontBackgroundColor,
          FontColor,
          FontFamily,
          FontSize,
          GeneralHtmlSupport,
          Heading,
          Highlight,
          HtmlComment,
          ImageBlock,
          ImageCaption,
          ImageEditing,
          ImageInline,
          ImageInsertViaUrl,
          ImageResize,
          ImageStyle,
          ImageToolbar,
          ImageUpload,
          ImageUtils,
          Indent,
          IndentBlock,
          Italic,
          Link,
          LinkImage,
          List,
          ListProperties,
          Mention,
          Paragraph,
          PlainTableOutput,
          Strikethrough,
          Table,
          TableCaption,
          TableColumnResize,
          TableProperties,
          TableCellProperties,
          TableToolbar,
          TextTransformation,
          TodoList,
          Underline,
        ],
        toolbar: {
          items: [
            "heading",
            "|",
            "bold",
            "italic",
            "strikethrough",
            "underline",
            "editBlock",
            "|",
            "bulletedList",
            "numberedList",
            "todoList",
            "|",
            "blockQuote",
            "|",
            "code",
            "codeBlock",
            "htmlEmbed",
            "|",
            "link",
            "uploadImage",
            "insertTable",
            "highlight",
            "removeFormat",
            "|",
            "outdent",
            "indent",
          ],
        },
        fontSize: {
          options: [10, 12, 14, "default", 18, 20, 22],
          supportAllValues: true,
        },
        heading: {
          options: [
            {
              model: "paragraph",
              title: "본문",
              class: "ck-heading_paragraph",
            },
            {
              model: "heading1",
              view: "h1",
              title: "제목 1",
              class: "ck-heading_heading1",
            },
            {
              model: "heading2",
              view: "h2",
              title: "제목 2",
              class: "ck-heading_heading2",
            },
            {
              model: "heading3",
              view: "h3",
              title: "제목 3",
              class: "ck-heading_heading3",
            },
          ],
        },
        htmlSupport: {
          allow: [
            {
              name: /^.*$/,
              styles: true,
              attributes: true,
              classes: true,
            },
          ],
        },
        image: {
          toolbar: ["toggleImageCaption", "|", "imageStyle:breakText"],
          styles: ["breakText"],
        },
        language: "ko",
        licenseKey: LICENSE_KEY,
        link: {
          addTargetToExternalLinks: true,
          defaultProtocol: "https://",
        },
        mention: {
          feeds: [
            {
              marker: "@",
              feed: [],
            },
          ],
        },
        placeholder: placeholder || "내용을 입력하세요.",
        table: {
          contentToolbar: [
            "tableColumn",
            "tableRow",
            "mergeTableCells",
            "tableProperties",
            "tableCellProperties",
          ],
          tableProperties: {
            alignment: ["left", "center", "right"],
          },
        },
        list: {
          properties: {
            styles: true,
            startIndex: true,
            reversed: true,
          },
        },
        translations: [translations],
      } as EditorConfig,
    };
  }, [isLayoutReady, placeholder]);

  return (
    <div className="document-editor">
      <div
        className="toolbar-container sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-100 py-2 flex justify-center"
        ref={toolbarRef}
      >
        {/* Toolbar will be injected here */}
      </div>

      <div className="content-container w-full px-4 sm:px-6 lg:px-8 pb-20">
        <div className="mx-auto max-w-4xl">
          {onTitleChange && (
            <input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="제목을 입력하세요."
              className="w-full text-4xl font-bold text-gray-900 border-none outline-none placeholder:text-gray-300 mt-12 mb-6 bg-transparent"
            />
          )}

          <div className="editor-container">
            {editorConfig && (
              <CKEditor
                editor={DecoupledEditor}
                config={editorConfig}
                data={value}
                onReady={(editor: DecoupledEditor) => {
                  const toolbarContainer = toolbarRef.current;
                  if (toolbarContainer) {
                    toolbarContainer.innerHTML = "";
                    toolbarContainer.appendChild(
                      editor.ui.view.toolbar.element!
                    );
                  }

                  const fileRepository = editor.plugins.get(
                    "FileRepository"
                  ) as unknown as {
                    createUploadAdapter: (loader: Loader) => unknown;
                  };

                  fileRepository.createUploadAdapter = (loader: Loader) =>
                    new MyBlogImageUploadAdapter(loader);

                  // Apply Tailwind Typography classes to the editor content
                  editor.editing.view.change((writer) => {
                    const root = editor.editing.view.document.getRoot();
                    if (root) {
                      const classes =
                        "ck-content prose prose-lg max-w-none placeholder:text-gray-300 focus:outline-none min-h-[400px] text-gray-900 marker:text-gray-900 prose-headings:text-gray-900 prose-strong:text-gray-900".split(
                          " "
                        );
                      classes.forEach((cls) => writer.addClass(cls, root));
                    }
                  });

                  // Handle Tab key for indentation
                  editor.editing.view.document.on(
                    "keydown",
                    (evt, data) => {
                      if (data.domEvent.key === "Tab") {
                        // Prevent focus change or default tab behavior
                        evt.stop();
                        data.preventDefault();

                        const commandName = data.domEvent.shiftKey
                          ? "outdent"
                          : "indent";
                        editor.execute(commandName);
                      }
                    },
                    { priority: "high" }
                  );
                }}
                onChange={(_, editor) => {
                  const data = editor.getData();
                  onChange(data);
                }}
              />
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .document-editor .ck-toolbar {
          border: none !important;
          background: transparent !important;
        }
        .document-editor .ck.ck-editor__editable_inline {
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .document-editor .ck-toolbar__items {
          justify-content: center;
        }
        /* Hide some toolbar borders/separators if needed or customize */
        .document-editor .ck-content ul > li::marker {
          color: #d1d5db;
        }
        .document-editor .ck-content ol > li::marker {
          color: inherit;
        }
        .document-editor .ck-content ul,
        .document-editor .ck-content ol {
          margin-top: 0.6rem;
          margin-bottom: 0.6rem;
        }
        .document-editor .ck-content li {
          margin-top: 0;
          margin-bottom: 0;
          line-height: 1.6;
        }
        .document-editor .ck-content p {
          margin-top: 0;
          margin-bottom: 0;
          line-height: 1.6;
        }
        .document-editor .ck-content h1,
        .document-editor .ck-content h2,
        .document-editor .ck-content h3 {
          margin-top: 1.5em;
          margin-bottom: 0.6em;
          line-height: 1.3;
        }
      `}</style>
    </div>
  );
}
