export const PUBLIC_IMAGE_BUCKET = "post-images-public";
export const PRIVATE_IMAGE_BUCKET = "post-images-private";

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
