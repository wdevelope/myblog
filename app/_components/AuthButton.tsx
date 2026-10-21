"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { disableAdminMode, enableAdminMode, isAdminModeChecked } from "@/lib/adminMode";
import { toast } from "sonner";

type User = { id: string; email?: string | null } | null;

interface AuthButtonProps {
    loginClassName?: string;
    logoutClassName?: string;
}

export default function AuthButton({
    loginClassName = "inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:brightness-110",
    logoutClassName = "h-10 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:bg-surface-2",
}: AuthButtonProps) {
    const router = useRouter();
    const [user, setUser] = useState<User>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = createSupabaseBrowserClient();

        // 초기 세션 확인
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
            // 브라우저를 다시 열어 관리자 화면 쿠키만 사라졌으면 다시 켜고 화면을 새로 받는다.
            if (session && !isAdminModeChecked()) {
                void enableAdminMode().then((enabled) => {
                    if (enabled) router.refresh();
                });
            }
        });

        // 인증 상태 변경 구독
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, [router]);

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
