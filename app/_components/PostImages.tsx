import Image from "next/image";
import { coverSrcFromImageKey, isImageProxySrc } from "@/lib/image";

export default function PostImages({ imageKeys }: { imageKeys?: string[] }) {
  if (!imageKeys?.length) return null;

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {imageKeys.map((key) => {
        const src = coverSrcFromImageKey(key) ?? key;
        return (
          <div key={key} className="relative aspect-auto min-h-[200px] w-full overflow-hidden rounded-2xl border border-border bg-surface">
            <Image
              src={src}
              alt=""
              width={800}
              height={600}
              className="h-auto w-full object-contain"
              sizes="(min-width: 640px) 50vw, 100vw"
              unoptimized={isImageProxySrc(src)}
            />
          </div>
        );
      })}
    </div>
  );
}
