import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function isLoggedIn() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return Boolean(data.user);
}

