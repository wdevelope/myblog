import Image from "next/image";
import { FiUser } from "react-icons/fi";
import { cn } from "@/lib/utils";

// 프로필 사진은 올리지 않는다. 관리자만 오웬 로고이고 다른 사용자는 모두 같은 사람 아이콘이다(로드맵 17절).
export default function UserAvatar({
  isAdmin,
  label,
  className = "size-10",
}: {
  isAdmin: boolean;
  label: string;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-border",
        !isAdmin && "bg-surface-2 text-muted",
        className,
      )}
    >
      {isAdmin ? (
        <Image src="/logo.png" alt="" width={80} height={80} className="size-full object-cover" />
      ) : (
        <FiUser aria-hidden className="size-1/2" />
      )}
    </span>
  );
}
