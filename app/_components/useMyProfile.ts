import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { MyProfile } from "@/lib/types";

const PROFILE_CHANGED_EVENT = "myblog:profile-changed";

// 헤더는 레이아웃에 있어 router.refresh()로는 다시 읽지 않는다. 마이페이지에서 프로필을 바꾸면 이 이벤트로 알린다.
export function notifyProfileChanged() {
  window.dispatchEvent(new Event(PROFILE_CHANGED_EVENT));
}

// 세션에는 프로필이 없어 로그인한 뒤 내 행을 한 번 읽는다. userId가 없으면(비로그인·관리자) 읽지 않는다.
export function useMyProfile(userId: string | null): MyProfile | null {
  const [loaded, setLoaded] = useState<{ userId: string; profile: MyProfile } | null>(null);

  useEffect(() => {
    if (!userId) return;
    const id = userId;
    let cancelled = false;

    async function load() {
      const { data } = await createSupabaseBrowserClient()
        .from("profiles")
        .select("nickname,avatar_path")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      setLoaded({ userId: id, profile: { nickname: data?.nickname ?? null, avatarPath: data?.avatar_path ?? null } });
    }

    void load();
    window.addEventListener(PROFILE_CHANGED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(PROFILE_CHANGED_EVENT, load);
    };
  }, [userId]);

  return loaded && loaded.userId === userId ? loaded.profile : null;
}
