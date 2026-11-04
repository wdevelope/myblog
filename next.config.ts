import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { assertNotProductionSupabase } from "./lib/supabase/devGuard";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : null;

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: "/**",
      },
    ],
    remotePatterns: [
      ...(supabaseHostname
        ? [
          {
            protocol: "https" as const,
            hostname: supabaseHostname,
          },
        ]
        : []),
      // Fallback or additional pattern if env var is missing during build
      {
        protocol: "https" as const,
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default function config(phase: string): NextConfig {
  if (phase === PHASE_DEVELOPMENT_SERVER) assertNotProductionSupabase(supabaseUrl);
  return nextConfig;
}
