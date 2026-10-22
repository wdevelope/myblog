"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { disableAdminMode } from "@/lib/adminMode";
import { useSessionUser } from "@/app/_components/useSessionUser";
import { toast } from "sonner";

interface AuthButtonProps {
    loginClassName?: string;
    logoutClassName?: string;
}

export default function AuthButton({
    loginClassName = "inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110",
    logoutClassName = "h-10 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:bg-surface-2",
}: AuthButtonProps) {
    const router = useRouter();
    const { user, loading } = useSessionUser();

    async function onLogout() {
        const promise = (async () => {
            const supabase = createSupabaseBrowserClient();
            await supabase.auth.signOut();
            await disableAdminMode();
            router.replace("/login");
            router.refresh();
            return "로그아웃 완료";
        })();

        toast.promise(promise, {
            loading: "로그아웃 중...",
            success: (data) => data,
            error: "로그아웃에 실패했어요.",
        });
    }

    // 로딩 중에는 로그인 버튼 표시 (SSR과 일치시켜 hydration mismatch 방지)
    if (loading) {
        return (
            <Link href="/login" className={loginClassName}>
                로그인
            </Link>
        );
    }

    if (user) {
        return (
            <button
                type="button"
                onClick={() => void onLogout()}
                className={logoutClassName}
            >
                로그아웃
            </button>
        );
    }

    return (
        <Link href="/login" className={loginClassName}>
            로그인
        </Link>
    );
}
