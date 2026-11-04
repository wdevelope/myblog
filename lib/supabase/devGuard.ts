const PRODUCTION_SUPABASE_HOST = "mgyoglaujbxfbuxxlcfj.supabase.co";

// 환경 파일 하나가 빠지면 개발 서버가 경고 없이 운영 DB·Storage·Auth에 붙어, 개발 중 쓰기가 운영에 남는다.
export function assertNotProductionSupabase(supabaseUrl: string | undefined) {
  if (!supabaseUrl) return;
  if (new URL(supabaseUrl).hostname !== PRODUCTION_SUPABASE_HOST) return;

  throw new Error(
    "개발 서버가 운영 Supabase(myblog)에 붙으려 해서 시작하지 않습니다. " +
      ".env.development.local에 개발 프로젝트(myblog-dev) 값을 넣어 주세요(README 개발 DB 절).",
  );
}
