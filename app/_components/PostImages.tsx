export default function PostImages({ imageKeys }: { imageKeys?: string[] }) {
  if (!imageKeys?.length) return null;

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {imageKeys.map((key) => {
        const src = key.startsWith("private/uploads/")
          ? `/api/uploads/get?key=${encodeURIComponent(key)}`
          : `/${key}`;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={key}
            src={src}
            alt=""
            className="h-auto w-full rounded-xl border border-black/5 dark:border-white/10"
            loading="lazy"
          />
        );
      })}
    </div>
  );
}

