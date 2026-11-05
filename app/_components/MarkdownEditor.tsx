"use client";

import "katex/dist/katex.min.css";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView, keymap, placeholder as editorPlaceholder } from "@codemirror/view";
import { useEffect, useEffectEvent, useId, useRef, useState, type ReactNode } from "react";
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
import {
  insertBlock,
  insertLink,
  setHeading,
  toggleInline,
  toggleLinePrefix,
  type TextEdit,
  type TextSelection,
} from "@/lib/markdown-edit";
import { markdownLivePreview } from "@/lib/markdown-live-preview";
import { cn } from "@/lib/utils";

type HeadingLevel = 0 | 1 | 2 | 3;
type EditAction = (selection: TextSelection) => TextEdit;

const HEADING_OPTIONS: { level: HeadingLevel; label: string }[] = [
  { level: 0, label: "본문" },
  { level: 1, label: "제목 1" },
  { level: 2, label: "제목 2" },
  { level: 3, label: "제목 3" },
];

function headingLevelOf(state: EditorState): HeadingLevel {
  const line = state.doc.lineAt(state.selection.main.from);
  return (/^(#{1,3}) /.exec(line.text)?.[1].length ?? 0) as HeadingLevel;
}

// 툴바 동작 하나를 트랜잭션 하나로 넣는다. 그래서 ⌘Z 한 번에 되돌아간다.
function applyEdit(view: EditorView, action: EditAction) {
  const { state } = view;
  const selection: TextSelection = {
    value: state.doc.toString(),
    start: state.selection.main.from,
    end: state.selection.main.to,
  };
  const edit: TextEdit = action(selection);
  view.dispatch({
    changes: { from: edit.from, to: edit.to, insert: edit.insert },
    selection: EditorSelection.range(edit.selectionStart, edit.selectionEnd),
    scrollIntoView: true,
    userEvent: "input",
  });
  view.focus();
}

function shortcut(action: EditAction) {
  return (view: EditorView) => {
    applyEdit(view, action);
    return true;
  };
}

// 한글 자판에서도 CodeMirror가 수정키 조합을 자판 위치의 영문 키로 다시 찾으므로 Mod-b 그대로 둔다.
const SHORTCUTS = keymap.of([
  { key: "Mod-b", run: shortcut((s) => toggleInline(s, "**")) },
  { key: "Mod-i", run: shortcut((s) => toggleInline(s, "*")) },
  { key: "Mod-k", run: shortcut(insertLink) },
]);

const isImage = (file: File) => file.type.startsWith("image/");

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
  compact = false,
}: {
  value: string;
  onChange: (value: string) => void;
  title?: string;
  onTitleChange?: (title: string) => void;
  onUploadImages: (files: File[]) => Promise<string[]>;
  placeholder?: string;
  compact?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const fileInputId = useId();
  const uploadCount = useRef(0);
  // 작성 칸이 보낸 값이 value로 돌아오기 전에 다음 입력이 들어올 수 있어, 돌아올 값을 적어 둔다.
  const sentValues = useRef<string[]>([]);
  const [headingLevel, setHeadingLevel] = useState<HeadingLevel>(0);
  // 작성 칸은 처음 값으로 한 번 만들고, 그 뒤 바깥 값은 아래 동기화 효과가 반영한다.
  const [initialValue] = useState(value);

  async function uploadImages(files: File[]) {
    const view = viewRef.current;
    const images = files.filter(isImage);
    if (!view || !images.length) return;
    uploadCount.current += 1;
    const placeholderText = `[이미지 업로드 중… ${uploadCount.current}]`;
    applyEdit(view, ({ start, end }) => ({
      from: start,
      to: end,
      insert: placeholderText,
      selectionStart: start + placeholderText.length,
      selectionEnd: start + placeholderText.length,
    }));
    const keys = await onUploadImages(images);
    // 업로드 중에도 글을 쓸 수 있으므로 지금 문서에서 자리표시자를 찾아 바꾼다. 실패하면 자리표시자만 지운다.
    if (viewRef.current !== view) return;
    const from = view.state.doc.toString().indexOf(placeholderText);
    if (from < 0) return;
    view.dispatch({
      changes: {
        from,
        to: from + placeholderText.length,
        insert: keys.map((key) => `![](${key})`).join("\n"),
      },
    });
  }

  const emitChange = useEffectEvent((next: string) => {
    sentValues.current.push(next);
    onChange(next);
  });
  const uploadDroppedImages = useEffectEvent((files: File[]) => {
    void uploadImages(files);
  });

  useEffect(() => {
    const parent = editorRef.current;
    if (!parent) return;
    const takeImages = (files: FileList | undefined, event: Event) => {
      const list = Array.from(files ?? []);
      if (!list.some(isImage)) return false;
      event.preventDefault();
      uploadDroppedImages(list);
      return true;
    };
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: initialValue,
        extensions: [
          history(),
          SHORTCUTS,
          keymap.of([...defaultKeymap, ...historyKeymap]),
          EditorView.lineWrapping,
          editorPlaceholder(placeholder),
          EditorView.contentAttributes.of({ "aria-label": "본문", spellcheck: "true" }),
          markdownLivePreview,
          EditorView.domEventHandlers({
            paste: (event) => takeImages(event.clipboardData?.files, event),
            drop: (event) => takeImages(event.dataTransfer?.files, event),
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) emitChange(update.state.doc.toString());
            if (update.docChanged || update.selectionSet) setHeadingLevel(headingLevelOf(update.state));
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      viewRef.current = null;
      view.destroy();
    };
  }, [initialValue, placeholder]);

  // 임시저장 불러오기처럼 바깥에서 본문을 바꾸면 작성 칸에 반영한다. 작성 칸이 보낸 값이 돌아온 것이면 건너뛴다.
  useEffect(() => {
    const sent = sentValues.current.lastIndexOf(value);
    if (sent >= 0) {
      sentValues.current.splice(0, sent + 1);
      return;
    }
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === value) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
  }, [value]);

  function run(action: EditAction) {
    if (viewRef.current) applyEdit(viewRef.current, action);
  }

  return (
    <div className="min-h-[500px]">
      <div className="sticky top-0 z-40 flex items-center border-b border-border bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex min-w-0 max-w-7xl flex-1 items-center gap-0.5 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:px-6 lg:justify-center lg:px-8">
          <select
            aria-label="문단 스타일"
            value={headingLevel}
            onChange={(e) => {
              const level = Number(e.target.value) as HeadingLevel;
              run((s) => setHeading(s, level));
            }}
            className="mr-1 h-9 shrink-0 rounded-lg border border-border bg-surface px-2 text-base text-foreground sm:text-sm"
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
        </div>
      </div>

      {/* 글 화면과 폭이 같도록 안쪽 여백을 폭 바깥에 둔다. 피드는 카드의 본문 폭을 쓴다. */}
      <div className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className={cn("mx-auto w-full", compact ? "max-w-xl px-4" : "max-w-4xl")}>
          {onTitleChange && (
            <textarea
              value={title}
              rows={1}
              onChange={(e) => onTitleChange(e.target.value.replace(/\s*\n\s*/g, " "))}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
              placeholder="제목을 입력하세요."
              className="mt-6 mb-6 block w-full resize-none border-none bg-transparent text-2xl font-black tracking-tight text-foreground outline-none [field-sizing:content] placeholder:text-muted md:mt-12 md:text-3xl"
            />
          )}

          <div
            ref={editorRef}
            className={cn("markdown-editor", compact && "markdown-compact", !onTitleChange && "mt-6 md:mt-12")}
          />
        </div>
      </div>
    </div>
  );
}
