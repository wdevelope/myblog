import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getAdminEmails } from "@/lib/supabase/env";

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const admins = getAdminEmails();
  if (!admins.length) return false;
  return admins.includes(email.toLowerCase());
}

export async function ensureAdminSynced(user: { id: string; email?: string | null } | null | undefined) {
  if (!user?.id) return;
  try {
    const service = createSupabaseServiceClient();
    await service
      .from("users")
      .upsert(
        { id: user.id, email: user.email?.toLowerCase() ?? null, is_admin: true },
        { onConflict: "id" },
      );
  } catch {
    // best-effort: app can still rely on server-side guards even if sync fails
  }
}

export async function isAdminDb(user: { id: string; email?: string | null } | null | undefined) {
  if (!user?.id) return false;
  if (isAdminEmail(user.email)) await ensureAdminSynced(user);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return false;
  return Boolean(data?.is_admin);
}

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
