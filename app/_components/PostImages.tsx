export default function PostImages({ imageKeys }: { imageKeys?: string[] }) {
  if (!imageKeys?.length) return null;

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {imageKeys.map((key) => {
        const [bucket, ...rest] = key.split(":");
        const objectPath = rest.join(":");
        const looksLikeSupabaseKey = Boolean(bucket && objectPath);

        const src = looksLikeSupabaseKey
          ? bucket === "post-images-public"
            ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodeURIComponent(objectPath).replaceAll("%2F", "/")}`
            : `/api/images?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(objectPath)}`
          : key;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={key}
            src={src}
            alt=""
            className="h-auto w-full rounded-2xl border border-border bg-surface"
            loading="lazy"
          />
        );
      })}
    </div>
  );
}
