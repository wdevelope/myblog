import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

export async function requireLogin(from: string) {
  const user = await getCurrentUser();
  if (user) return user;
  redirect(`/login?from=${encodeURIComponent(from)}`);
}

export async function requireAdmin(from: string) {
  const user = await requireLogin(from);
  if (!isAdminEmail(user.email)) redirect("/");
  return user;
}

