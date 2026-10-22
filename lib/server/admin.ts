import "server-only";
import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Viewer = { user: User | null; isAdmin: boolean };

// 요청 헤더와 user_metadata는 클라이언트·사용자 본인이 바꿀 수 있어 판정에 쓰지 않는다.
// auth.getUser()는 Auth 서버에서 세션을 검증하고, app_metadata는 service role만 바꿀 수 있다.
// RLS의 is_admin()과 같은 근거(app_metadata.is_admin === true)만 봐야 앱과 DB의 판정이 갈리지 않는다.
export const getViewer = cache(async (): Promise<Viewer> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { user: null, isAdmin: false };
  return { user, isAdmin: user.app_metadata?.is_admin === true };
});

// 공개 페이지용. 관리자가 로그인하면 켜지는 draft mode 요청에서만 세션을 읽는다.
// 방문자 요청은 쿠키를 읽지 않아 페이지가 정적(ISR)으로 남는다. 판정은 그대로 getViewer가 한다.
export async function getPreviewViewer(): Promise<Viewer> {
  const { isEnabled } = await draftMode();
  if (!isEnabled) return { user: null, isAdmin: false };
  return getViewer();
}

// 서버 액션·라우트 핸들러용: redirect하지 않고 호출부가 실패 응답을 고르게 한다.
export async function assertAdmin(): Promise<User | null> {
  const { user, isAdmin } = await getViewer();
  return user && isAdmin ? user : null;
}

export async function requireLogin(from: string) {
  const { user } = await getViewer();
  if (user) return user;
  redirect(`/login?from=${encodeURIComponent(from)}`);
}

export async function requireAdmin(from: string) {
  const user = await requireLogin(from);
  const { isAdmin } = await getViewer();
  if (!isAdmin) redirect("/");
  return user;
}
