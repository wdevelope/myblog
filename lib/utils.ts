import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 서버(Vercel, UTC)와 브라우저 시간대에 상관없이 글 날짜는 한국 시간으로 보인다.
export function formatPostDate(iso: string, style: "iso" | "ko" = "iso") {
  const date = new Date(iso);
  if (style === "ko") return date.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
  // sv-SE 로캘은 YYYY-MM-DD로 쓴다.
  return date.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

// 관리자는 닉네임과 상관없이 Owen이다. 다른 사용자는 닉네임, 없으면 id 앞 6자로 부른다. 댓글·마이페이지·헤더가 같은 이름을 쓴다.
export function userDisplayName(
  userId: string | null | undefined,
  isAdmin: boolean,
  nickname?: string | null,
) {
  if (isAdmin) return "Owen";
  if (nickname) return nickname;
  return userId ? `사용자 ${userId.slice(0, 6)}` : "사용자";
}
