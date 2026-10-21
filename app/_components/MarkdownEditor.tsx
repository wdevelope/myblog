"use client";

import {
  useDeferredValue,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  Bold,
  Code,
  Highlighter,
  ImagePlus,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Quote,
  Sigma,
  SquareCode,
  Strikethrough,
  Underline,
} from "lucide-react";
import MarkdownContent from "@/app/_components/MarkdownContent";
import {
  insertBlock,
  insertLink,
  setHeading,
  toggleInline,
  toggleLinePrefix,
  type TextEdit,
  type TextSelection,
} from "@/lib/markdown-edit";
import { cn } from "@/lib/utils";

type HeadingLevel = 0 | 1 | 2 | 3;
type EditAction = (selection: TextSelection) => TextEdit;

const HEADING_OPTIONS: { level: HeadingLevel; label: string }[] = [
  { level: 0, label: "본문" },
  { level: 1, label: "제목 1" },
  { level: 2, label: "제목 2" },
  { level: 3, label: "제목 3" },
];

// 한글 입력 중에는 e.key가 자모로 오므로 단축키는 자판 위치(e.code)로 고른다.
const SHORTCUTS: Record<string, EditAction> = {
  KeyB: (s) => toggleInline(s, "**"),
  KeyI: (s) => toggleInline(s, "*"),
  KeyK: insertLink,
};

function headingLevelAt(value: string, position: number): HeadingLevel {
  const lineStart = value.lastIndexOf("\n", position - 1) + 1;
  return (/^(#{1,3}) /.exec(value.slice(lineStart))?.[1].length ?? 0) as HeadingLevel;
}

// 툴바로 바꾼 글자도 ⌘Z로 되돌릴 수 있게 execCommand로 넣는다. 지원하지 않는 환경(jsdom 등)은 setRangeText로 바꾼다.
function applyToTextarea(
  textarea: HTMLTextAreaElement,
  edit: TextEdit,
  onChange: (value: string) => void
) {
  textarea.focus();
  textarea.setSelectionRange(edit.from, edit.to);
  const nothingToDo = edit.from === edit.to && edit.insert === "";
  const handled =
    nothingToDo ||
    (typeof document.execCommand === "function" &&
      document.execCommand(edit.insert === "" ? "delete" : "insertText", false, edit.insert));
  if (!handled) {
    textarea.setRangeText(edit.insert, edit.from, edit.to, "end");
    onChange(textarea.value);
  }
  textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd);
}

function ToolButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      // 버튼을 눌러도 textarea의 선택 영역이 풀리지 않게 포커스를 옮기지 않는다.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-foreground"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />;
}

export default function MarkdownEditor({
  value,
  onChange,
  title,
  onTitleChange,
  onUploadImages,
  placeholder = "내용을 입력하세요.",
}: {
  value: string;
  onChange: (value: string) => void;
  title?: string;
  onTitleChange?: (title: string) => void;
  onUploadImages: (files: File[]) => Promise<string[]>;
  placeholder?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputId = useId();
  const uploadCount = useRef(0);
  const [headingLevel, setHeadingLevel] = useState<HeadingLevel>(0);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const previewSource = useDeferredValue(value);

  // 본문 길이에 맞춰 textarea를 늘려 바깥 화면 하나로 스크롤한다.
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  function run(action: EditAction) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const selection = {
      value: textarea.value,
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    };
    applyToTextarea(textarea, action(selection), onChange);
    setHeadingLevel(headingLevelAt(textarea.value, textarea.selectionStart));
  }

  async function uploadImages(files: File[]) {
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (!images.length) return;
    uploadCount.current += 1;
    const placeholderText = `[이미지 업로드 중… ${uploadCount.current}]`;
    run(({ start, end }) => ({
      from: start,
      to: end,
      insert: placeholderText,
      selectionStart: start + placeholderText.length,
      selectionEnd: start + placeholderText.length,
    }));
    const keys = await onUploadImages(images);
    // 업로드 중에도 글을 쓸 수 있으므로 지금 값에서 자리표시자를 찾아 바꾼다. 실패하면 자리표시자만 지운다.
    const current = textareaRef.current?.value ?? value;
    onChange(current.replace(placeholderText, keys.map((key) => `![](${key})`).join("\n")));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing || !(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
    const action = SHORTCUTS[e.code];
    if (!action) return;
    e.preventDefault();
    run(action);
  }

  function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.clipboardData.files);
    if (!files.some((file) => file.type.startsWith("image/"))) return;
    e.preventDefault();
    void uploadImages(files);
  }

  function handleDrop(e: DragEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.dataTransfer.files);
    if (!files.some((file) => file.type.startsWith("image/"))) return;
    e.preventDefault();
    void uploadImages(files);
  }

  return (
    <div className="min-h-[500px]">
      <div className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-0.5 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:px-6 lg:justify-center lg:px-8">
          <select
            aria-label="문단 스타일"
            value={headingLevel}
            onChange={(e) => {
              const level = Number(e.target.value) as HeadingLevel;
              run((s) => setHeading(s, level));
            }}
            className="mr-1 h-9 shrink-0 rounded-lg border border-border bg-surface px-2 text-sm text-foreground"
          >
            {HEADING_OPTIONS.map(({ level, label }) => (
              <option key={level} value={level}>
                {label}
              </option>
            ))}
          </select>
          <Divider />
          <ToolButton label="굵게 (⌘B)" onClick={() => run((s) => toggleInline(s, "**"))}>
            <Bold className="size-4.5" />
          </ToolButton>
          <ToolButton label="기울임 (⌘I)" onClick={() => run((s) => toggleInline(s, "*"))}>
            <Italic className="size-4.5" />
          </ToolButton>
          <ToolButton label="취소선" onClick={() => run((s) => toggleInline(s, "~~"))}>
            <Strikethrough className="size-4.5" />
          </ToolButton>
          <ToolButton label="밑줄" onClick={() => run((s) => toggleInline(s, "++"))}>
            <Underline className="size-4.5" />
          </ToolButton>
          <ToolButton label="형광펜" onClick={() => run((s) => toggleInline(s, "=="))}>
            <Highlighter className="size-4.5" />
          </ToolButton>
          <Divider />
          <ToolButton label="글머리 목록" onClick={() => run((s) => toggleLinePrefix(s, "bullet"))}>
            <List className="size-4.5" />
          </ToolButton>
          <ToolButton label="번호 목록" onClick={() => run((s) => toggleLinePrefix(s, "ordered"))}>
            <ListOrdered className="size-4.5" />
          </ToolButton>
          <Divider />
          <ToolButton label="인용" onClick={() => run((s) => toggleLinePrefix(s, "quote"))}>
            <Quote className="size-4.5" />
          </ToolButton>
          <ToolButton label="구분선" onClick={() => run((s) => insertBlock(s, "rule"))}>
            <Minus className="size-4.5" />
          </ToolButton>
          <Divider />
          <ToolButton label="코드블록" onClick={() => run((s) => insertBlock(s, "code"))}>
            <SquareCode className="size-4.5" />
          </ToolButton>
          <ToolButton label="인라인 코드" onClick={() => run((s) => toggleInline(s, "`"))}>
            <Code className="size-4.5" />
          </ToolButton>
          <ToolButton label="수식" onClick={() => run((s) => toggleInline(s, "$"))}>
            <Sigma className="size-4.5" />
          </ToolButton>
          <Divider />
          <ToolButton label="링크 (⌘K)" onClick={() => run(insertLink)}>
            <Link className="size-4.5" />
          </ToolButton>
          <ToolButton
            label="이미지"
            onClick={() => document.getElementById(fileInputId)?.click()}
          >
            <ImagePlus className="size-4.5" />
          </ToolButton>
          <input
            id={fileInputId}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void uploadImages(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />

          <div className="ml-auto flex shrink-0 rounded-lg bg-surface-2 p-0.5 text-xs font-bold md:hidden">
            {(["write", "preview"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                aria-pressed={mode === tab}
                onClick={() => setMode(tab)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 transition",
                  mode === tab ? "bg-surface text-foreground shadow-sm" : "text-muted"
                )}
              >
                {tab === "write" ? "작성" : "미리보기"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        {onTitleChange && (
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="제목을 입력하세요."
            className="mt-6 mb-6 w-full border-none bg-transparent text-2xl font-bold text-foreground outline-none placeholder:text-muted md:mt-12 md:text-4xl"
          />
        )}

        <div className="grid gap-10 md:grid-cols-2">
          <div className={cn(mode === "preview" && "hidden md:block")}>
            <textarea
              ref={textareaRef}
              aria-label="본문"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onSelect={(e) =>
                setHeadingLevel(headingLevelAt(e.currentTarget.value, e.currentTarget.selectionStart))
              }
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onDrop={handleDrop}
              placeholder={placeholder}
              className={cn(
                "block min-h-[50vh] w-full resize-none overflow-hidden bg-transparent text-base leading-7 text-foreground outline-none placeholder:text-muted",
                !onTitleChange && "mt-6 md:mt-12"
              )}
            />
          </div>

          <div
            className={cn(
              "md:sticky md:top-16 md:max-h-[calc(100dvh-9rem)] md:self-start md:overflow-auto md:border-l md:border-border md:pl-10",
              !onTitleChange && "mt-6 md:mt-12",
              mode === "write" && "hidden md:block"
            )}
          >
            {previewSource.trim() ? (
              <MarkdownContent content={previewSource} />
            ) : (
              <p className="text-sm text-muted">미리보기할 내용이 없어요.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
