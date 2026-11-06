"use client";

import Link from "next/link";
import LogoutButton from "@/app/_components/LogoutButton";
import { useSessionUser } from "@/app/_components/useSessionUser";
import { buttonClass } from "@/app/_components/ui";

interface AuthButtonProps {
    loginClassName?: string;
    logoutClassName?: string;
}

export default function AuthButton({
    loginClassName = buttonClass(),
    logoutClassName = "h-10 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:bg-surface-2",
}: AuthButtonProps) {
    const { user, loading } = useSessionUser();

    // 로딩 중에는 로그인 버튼 표시 (SSR과 일치시켜 hydration mismatch 방지)
    if (loading || !user) {
        return (
            <Link href="/login" className={loginClassName}>
                로그인
            </Link>
        );
    }

    return <LogoutButton className={logoutClassName} />;
}
