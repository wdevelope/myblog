import { redirect } from "next/navigation";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

import { headers } from "next/headers";

export const getCurrentUser = cache(async () => {
  // [PERF] 미들웨어에서 주입한 헤더 정보가 있는지 먼저 확인합니다.
  // 이 헤더가 있다면 중복으로 Supabase 서버에 물어볼 필요가 없어 속도가 매우 빨라집니다.
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  const userEmail = headersList.get("x-user-email");

  if (userId) {
    return {
      id: userId,
      email: userEmail,
      // 필요한 다른 필드가 있다면 여기에 빈 값으로 추가하거나 헤더를 더 주입합니다.
    } as unknown as User;
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

export const isAdminDb = cache(async (user: { id: string } | null | undefined) => {
  if (!user?.id) return false;

  // [PERF] 1. JWT의 app_metadata 또는 user_metadata에 is_admin 정보가 있는지 먼저 확인합니다. (Custom Claims 활용)
  const u = user as { app_metadata?: { is_admin?: boolean }; user_metadata?: { is_admin?: boolean } };
  if (u.app_metadata?.is_admin || u.user_metadata?.is_admin) return true;

  // [PERF] 2. 미들웨어에서 주입한 관리자 여부 헤더가 있는지 확인합니다.
  const headersList = await headers();
  if (headersList.get("x-user-is-admin") === "true") return true;

  // [PERF] 3. 마지막 수단으로 DB를 직접 조회합니다.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return false;
  return Boolean(data?.is_admin);
});

export async function requireLogin(from: string) {
  const user = await getCurrentUser();
  if (user) return user;
  redirect(`/login?from=${encodeURIComponent(from)}`);
}

export async function requireAdmin(from: string) {
  const user = await requireLogin(from);
  if (!(await isAdminDb(user))) redirect("/");
  return user;
}
