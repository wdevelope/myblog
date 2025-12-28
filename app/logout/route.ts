import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const url = new URL(request.url);
  const to = url.searchParams.get("to");
  const redirectTo = to && to.startsWith("/") ? to : "/";
  return NextResponse.redirect(new URL(redirectTo, url.origin));
}

