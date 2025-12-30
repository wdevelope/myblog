import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function isAdminDb(user: { id: string; email?: string | null } | null | undefined) {
  if (!user?.id) return false;

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
