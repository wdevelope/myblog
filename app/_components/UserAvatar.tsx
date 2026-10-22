import Image from "next/image";
import { FiUser } from "react-icons/fi";
import { cn } from "@/lib/utils";

// 관리자는 사진과 상관없이 오웬 로고다. 다른 사용자는 올린 사진(src), 없으면 사람 아이콘이다(로드맵 17·18절).
export default function UserAvatar({
  isAdmin,
  label,
  src,
  className = "size-10",
}: {
  isAdmin: boolean;
  label: string;
  src?: string | null;
  className?: string;
}) {
  const image = isAdmin ? "/logo.png" : src;

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-border",
        !image && "bg-surface-2 text-muted",
        className,
      )}
    >
      {image ? (
        <Image src={image} alt="" width={80} height={80} className="size-full object-cover" />
      ) : (
        <FiUser aria-hidden className="size-1/2" />
      )}
    </span>
  );
}
