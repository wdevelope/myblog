import type { Visibility } from "@/lib/types";

export const PUBLIC_IMAGE_BUCKET = "post-images-public";
export const PRIVATE_IMAGE_BUCKET = "post-images-private";

export function imageBucketFor(visibility: Visibility) {
  return visibility === "private" ? PRIVATE_IMAGE_BUCKET : PUBLIC_IMAGE_BUCKET;
}

type PostImageFields = { content: string; imageKeys: string[]; thumbnailImageKey: string | null };

// 업로드가 만드는 경로(`날짜/uuid.확장자`)에는 공백·괄호·#이 없다. 본문은 이미지 문법 `](` 바로 뒤의 키만 본다.
function contentKeyPattern(bucket: string) {
  return new RegExp(`(\\]\\()${bucket}:([^\\s)#]+)`, "g");
}

// 본문·첨부·썸네일에서 그 버킷을 가리키는 경로. 같은 파일을 여러 곳에서 써도 한 번만 나온다.
export function imagePathsInBucket(post: PostImageFields, bucket: string): string[] {
  const paths = new Set<string>();
  for (const match of post.content.matchAll(contentKeyPattern(bucket))) paths.add(match[2]);
  const prefix = `${bucket}:`;
  for (const key of [...post.imageKeys, post.thumbnailImageKey ?? ""]) {
    if (key.startsWith(prefix) && key.length > prefix.length) paths.add(key.slice(prefix.length));
  }
  return [...paths];
}

// 옮긴 경로의 키만 버킷 이름을 바꾼다. 경로와 크기·정렬 조각(#w=…)은 그대로다.
export function replaceImageBucket<T extends PostImageFields>(post: T, from: string, to: string, paths: string[]): T {
  const moved = new Set(paths);
  const prefix = `${from}:`;
  const swap = (key: string) =>
    key.startsWith(prefix) && moved.has(key.slice(prefix.length)) ? `${to}:${key.slice(prefix.length)}` : key;
  return {
    ...post,
    content: post.content.replace(contentKeyPattern(from), (whole, open: string, path: string) =>
      moved.has(path) ? `${open}${to}:${path}` : whole
    ),
    imageKeys: post.imageKeys.map(swap),
    thumbnailImageKey: post.thumbnailImageKey && swap(post.thumbnailImageKey),
  };
}

export function coverSrcFromImageKey(key: string) {
  const [bucket, ...rest] = key.split(":");
  const objectPath = rest.join(":");
  const looksLikeSupabaseKey = Boolean(bucket && objectPath);
  if (!looksLikeSupabaseKey) return key;

  // Force API proxy for consistency and reliability
  if (bucket === PUBLIC_IMAGE_BUCKET) {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (base) {
      const path = encodeURIComponent(objectPath).replaceAll("%2F", "/");
      return `${base}/storage/v1/object/public/${bucket}/${path}`;
    }
  }

  return `/api/images?bucket=${encodeURIComponent(
    bucket
  )}&path=${encodeURIComponent(objectPath)}`;
}

// 목록·카드의 표지 규칙: 썸네일이 없으면 첫 첨부 이미지.
export function coverKeyOf(post: { thumbnailImageKey?: string | null; imageKeys?: string[] }) {
  return post.thumbnailImageKey?.trim() || post.imageKeys?.[0] || null;
}
