export function coverSrcFromImageKey(key: string) {
  const [bucket, ...rest] = key.split(":");
  const objectPath = rest.join(":");
  const looksLikeSupabaseKey = Boolean(bucket && objectPath);
  if (!looksLikeSupabaseKey) return key;

  // Force API proxy for consistency and reliability
  if (bucket === "post-images-public") {
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
