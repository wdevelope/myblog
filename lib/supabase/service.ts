import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function createSupabaseServiceClient() {
  const { url } = getSupabaseEnv();
  // env.ts는 브라우저 클라이언트도 import하므로 service role 키는 서버 전용인 이 모듈에서만 읽는다.
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("Missing env var: SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

