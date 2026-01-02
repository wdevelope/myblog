import { coverSrcFromImageKey } from "@/lib/image";

export default function PostImages({ imageKeys }: { imageKeys?: string[] }) {
  if (!imageKeys?.length) return null;

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {imageKeys.map((key) => {
        const src = coverSrcFromImageKey(key) ?? key;
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
