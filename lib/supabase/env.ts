function required(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export function getSupabaseEnv() {
  // NOTE: This module is imported by client code (e.g. Supabase browser client).
  // In Next.js, only *static* `process.env.NEXT_PUBLIC_*` accesses are inlined into the client bundle.
  // Avoid `process.env[name]` dynamic lookups or these values will be `undefined` in the browser.
  const url = required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  const anonKey = required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  return {
    url,
    anonKey,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}
