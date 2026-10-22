"use client";

import Link from "next/link";
import { useSessionUser } from "@/app/_components/useSessionUser";
import { useMyProfile } from "@/app/_components/useMyProfile";
import UserAvatar from "@/app/_components/UserAvatar";
import { userDisplayName } from "@/lib/utils";
import { avatarSrc } from "@/lib/avatar";

// 헤더용. 로그인하면 로그아웃 버튼 대신 아바타가 마이페이지로 간다(로그아웃은 마이페이지·모바일 메뉴에 있다).
export default function AccountButton({ loginClassName }: { loginClassName: string }) {
  const { user, loading } = useSessionUser();
  // 표시용이다. 권한은 서버가 판정한다.
  const isAdmin = user?.app_metadata?.is_admin === true;
  // 관리자는 로고·Owen으로 고정이라 프로필을 읽지 않는다.
  const profile = useMyProfile(user && !isAdmin ? user.id : null);

  // 로딩 중에는 로그인 버튼 표시 (SSR과 일치시켜 hydration mismatch 방지)
  if (loading || !user) {
    return (
      <Link href="/login" className={loginClassName}>
        로그인
      </Link>
    );
  }

  return (
    <Link
      href="/mypage"
      aria-label="마이페이지"
      title="마이페이지"
      className="flex rounded-full transition hover:opacity-90"
    >
      <UserAvatar
        isAdmin={isAdmin}
        label={userDisplayName(user.id, isAdmin, profile?.nickname)}
        src={avatarSrc(profile?.avatarPath)}
      />
    </Link>
  );
}
