// 본문 이미지의 크기·정렬. 마크다운 `![](키)`에는 담을 자리가 없어 주소 끝 조각에 둔다: `키#w=60&align=center`.
// 글 화면 렌더러와 에디터가 같이 쓴다. 조각이 옵션으로만 이뤄졌을 때만 읽고, 아니면 주소의 일부로 그대로 둔다.

export const IMAGE_ALIGNS = ["left", "center", "right"] as const;
export type ImageAlign = (typeof IMAGE_ALIGNS)[number];
// width는 본문 폭 대비 %다.
export type ImageOptions = { width?: number; align?: ImageAlign };

export const MIN_IMAGE_WIDTH = 10;
export const MAX_IMAGE_WIDTH = 100;

function parseWidth(value: string) {
  if (!/^\d{1,3}$/.test(value)) return undefined;
  const width = Number(value);
  return width >= MIN_IMAGE_WIDTH && width <= MAX_IMAGE_WIDTH ? width : undefined;
}

function parseAlign(value: string) {
  return (IMAGE_ALIGNS as readonly string[]).includes(value) ? (value as ImageAlign) : undefined;
}

export function parseImageUrl(url: string): { src: string; options: ImageOptions } {
  const hash = url.lastIndexOf("#");
  if (hash < 0) return { src: url, options: {} };

  // 우리 키로만 된 조각은 떼어 내고, 값이 틀리면 그 값만 버린다.
  const options: ImageOptions = {};
  for (const part of url.slice(hash + 1).split("&")) {
    const match = /^(w|align)=(.*)$/.exec(part);
    if (!match) return { src: url, options: {} };
    if (match[1] === "w") {
      const width = parseWidth(match[2]);
      if (width !== undefined) options.width = width;
    } else {
      const align = parseAlign(match[2]);
      if (align) options.align = align;
    }
  }
  return { src: url.slice(0, hash), options };
}

export function formatImageUrl(src: string, options: ImageOptions): string {
  const parts: string[] = [];
  const width = options.width === undefined ? undefined : parseWidth(String(options.width));
  if (width !== undefined) parts.push(`w=${width}`);
  if (options.align && parseAlign(options.align)) parts.push(`align=${options.align}`);
  return parts.length ? `${src}#${parts.join("&")}` : src;
}
