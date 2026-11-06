import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { assertNotProductionSupabase } from "./lib/supabase/devGuard";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : null;

const nextConfig: NextConfig = {
  images: {
    // 앱이 next/image에 넘기는 주소 모양으로만 좁힌다. 쿼리가 붙는 /api/images는 unoptimized로 변환기를 타지 않는다.
    localPatterns: [
      {
        pathname: "/**",
        search: "",
      },
    ],
    remotePatterns: [
      ...(supabaseHostname
        ? [
          {
            protocol: "https" as const,
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
            search: "",
          },
        ]
        : []),
    ],
  },
};

export default function config(phase: string): NextConfig {
  if (phase === PHASE_DEVELOPMENT_SERVER) assertNotProductionSupabase(supabaseUrl);
  return nextConfig;
}
