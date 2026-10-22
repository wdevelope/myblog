import { syntaxTree } from "@codemirror/language";
import { EditorSelection } from "@codemirror/state";
import { WidgetType, type EditorView } from "@codemirror/view";
import {
  IMAGE_ALIGNS,
  MAX_IMAGE_WIDTH,
  MIN_IMAGE_WIDTH,
  formatImageUrl,
  parseImageUrl,
  type ImageAlign,
  type ImageOptions,
} from "@/lib/image-options";

// 작성 칸의 이미지. 원문을 드러내지 않으므로 누르면 이미지 전체를 선택하고, 선택된 이미지에 정렬·삭제 툴바와 크기 손잡이를 띄운다.
// 툴바·손잡이는 트랜잭션 하나로 주소 끝 조각(lib/image-options)만 바꾸므로 ⌘Z 한 번에 되돌아간다.

const SVG_NS = "http://www.w3.org/2000/svg";
const ALIGN_LABELS: Record<ImageAlign, string> = { left: "왼쪽 정렬", center: "가운데 정렬", right: "오른쪽 정렬" };
const ICONS: Record<ImageAlign | "delete", string[]> = {
  left: ["M15 12H3", "M17 18H3", "M21 6H3"],
  center: ["M17 12H7", "M19 18H5", "M21 6H3"],
  right: ["M21 12H9", "M21 18H7", "M21 6H3"],
  delete: [
    "M3 6h18",
    "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",
    "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",
    "M10 11v6",
    "M14 11v6",
  ],
};

function imageNodeAt(view: EditorView, pos: number) {
  const inner = syntaxTree(view.state).resolveInner(pos, 1);
  for (let node: typeof inner | null = inner; node; node = node.parent) {
    if (node.name === "Image") return node;
  }
  return null;
}

function selectImage(view: EditorView, pos: number) {
  const node = imageNodeAt(view, pos);
  if (node) view.dispatch({ selection: EditorSelection.range(node.from, node.to) });
  view.focus();
}

function updateImage(view: EditorView, pos: number, change: (options: ImageOptions) => ImageOptions) {
  const node = imageNodeAt(view, pos);
  const url = node?.getChild("URL");
  if (!node || !url) return;
  const { src, options } = parseImageUrl(view.state.sliceDoc(url.from, url.to));
  const next = formatImageUrl(src, change(options));
  const delta = next.length - (url.to - url.from);
  view.dispatch({
    changes: { from: url.from, to: url.to, insert: next },
    selection: EditorSelection.range(node.from, node.to + delta),
  });
  view.focus();
}

function deleteImage(view: EditorView, pos: number) {
  const node = imageNodeAt(view, pos);
  if (node) view.dispatch({ changes: { from: node.from, to: node.to }, selection: { anchor: node.from } });
  view.focus();
}

function icon(paths: string[]) {
  const svg = document.createElementNS(SVG_NS, "svg");
  for (const [name, value] of Object.entries({
    viewBox: "0 0 24 24",
    width: "18",
    height: "18",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
  })) {
    svg.setAttribute(name, value);
  }
  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  return svg;
}

function toolButton(label: string, paths: string[], onClick: () => void, text?: string) {
  const button = document.createElement("button");
  button.type = "button";
  button.title = label;
  button.setAttribute("aria-label", label);
  button.append(icon(paths));
  if (text) button.append(text);
  // 눌러도 에디터 포커스와 이미지 선택이 풀리지 않게 한다.
  button.addEventListener("mousedown", (event) => event.preventDefault());
  button.addEventListener("click", (event) => {
    event.preventDefault();
    onClick();
  });
  return button;
}

function alignOf(frame: HTMLElement) {
  return IMAGE_ALIGNS.find((align) => frame.classList.contains(`img-align-${align}`));
}

// 끄는 동안은 폭만 바로 바꾸고, 놓을 때 한 번 저장한다(5% 단위).
function startResize(view: EditorView, frame: HTMLElement, handle: HTMLElement, event: PointerEvent) {
  event.preventDefault();
  const containerWidth = (frame.closest(".cm-line") ?? frame.parentElement)?.clientWidth;
  if (!containerWidth) return;
  // 가운데 정렬은 양쪽으로 커지고, 오른쪽 정렬은 손잡이가 왼쪽 아래에 있다.
  const align = alignOf(frame);
  const factor = align === "center" ? 2 : align === "right" ? -1 : 1;
  const startX = event.clientX;
  const startWidth = frame.getBoundingClientRect().width;
  let width: number | undefined;

  const move = (moveEvent: PointerEvent) => {
    const pixels = startWidth + (moveEvent.clientX - startX) * factor;
    const percent = Math.round((pixels / containerWidth) * 20) * 5;
    width = Math.min(MAX_IMAGE_WIDTH, Math.max(MIN_IMAGE_WIDTH, percent));
    frame.style.width = `${width}%`;
    frame.querySelector("img")?.style.setProperty("width", "100%");
  };
  const end = () => {
    handle.removeEventListener("pointermove", move);
    handle.removeEventListener("pointerup", end);
    handle.removeEventListener("pointercancel", end);
    if (width !== undefined) {
      const next = width;
      updateImage(view, view.posAtDOM(frame), (options) => ({ ...options, width: next }));
    }
  };
  handle.setPointerCapture(event.pointerId);
  handle.addEventListener("pointermove", move);
  handle.addEventListener("pointerup", end);
  handle.addEventListener("pointercancel", end);
}

export class ImageWidget extends WidgetType {
  constructor(
    readonly src: string,
    readonly alt: string,
    readonly options: ImageOptions,
    readonly selected: boolean
  ) {
    super();
  }

  eq(other: ImageWidget) {
    return (
      other.src === this.src &&
      other.alt === this.alt &&
      other.options.width === this.options.width &&
      other.options.align === this.options.align &&
      other.selected === this.selected
    );
  }

  toDOM(view: EditorView) {
    const frame = document.createElement("span");
    frame.className = "cm-md-image-frame";

    const image = document.createElement("img");
    image.src = this.src;
    image.alt = this.alt;
    image.className = "cm-md-image";
    image.draggable = false;
    // 이미지가 늦게 열려 줄 높이가 바뀌면 에디터가 다시 재게 한다.
    image.onload = () => view.requestMeasure();

    const toolbar = document.createElement("span");
    toolbar.className = "cm-md-image-toolbar";
    for (const align of IMAGE_ALIGNS) {
      const button = toolButton(ALIGN_LABELS[align], ICONS[align], () =>
        updateImage(view, view.posAtDOM(frame), (options) => ({ ...options, align }))
      );
      button.dataset.align = align;
      toolbar.append(button);
    }
    toolbar.append(toolButton("이미지 삭제", ICONS.delete, () => deleteImage(view, view.posAtDOM(frame)), "삭제"));

    const handle = document.createElement("span");
    handle.className = "cm-md-image-handle";
    handle.setAttribute("aria-hidden", "true");
    handle.addEventListener("pointerdown", (event) => startResize(view, frame, handle, event));

    frame.append(image, toolbar, handle);
    frame.addEventListener("mousedown", (event) => {
      if (event.target instanceof Element && event.target.closest(".cm-md-image-toolbar, .cm-md-image-handle")) return;
      event.preventDefault();
      selectImage(view, view.posAtDOM(frame));
    });
    this.apply(frame);
    return frame;
  }

  // 선택·폭·정렬만 바뀌면 이미지를 다시 불러오지 않고 표시만 바꾼다.
  updateDOM(dom: HTMLElement) {
    const image = dom.querySelector("img");
    if (!dom.classList.contains("cm-md-image-frame") || !image) return false;
    if (image.getAttribute("src") !== this.src || image.alt !== this.alt) return false;
    this.apply(dom);
    return true;
  }

  // 누름·끌기는 위에서 직접 처리한다. 에디터가 받으면 커서를 이미지 앞에 둔다.
  ignoreEvent() {
    return true;
  }

  private apply(frame: HTMLElement) {
    const { width, align } = this.options;
    frame.style.width = width ? `${width}%` : "";
    frame.querySelector("img")?.style.setProperty("width", width ? "100%" : "");
    frame.classList.toggle("is-selected", this.selected);
    for (const value of IMAGE_ALIGNS) frame.classList.toggle(`img-align-${value}`, align === value);
    for (const button of frame.querySelectorAll<HTMLElement>("[data-align]")) {
      button.setAttribute("aria-pressed", String(button.dataset.align === align));
    }
  }
}
