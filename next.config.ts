import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { assertNotProductionSupabase } from "./lib/supabase/devGuard";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : null;

// 스크립트·스타일 출처를 좁히는 CSP는 정적 페이지에 nonce를 넣을 수 없어 쓰지 않는다. 인라인 스크립트와 상관없는 지시어만 건다.
// frame-ancestors는 다른 사이트가 iframe으로 띄워 탈퇴·댓글 버튼을 누르게 하는 클릭재킹을 막는다(옛 브라우저는 X-Frame-Options).
const CONTENT_SECURITY_POLICY = ["frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'", "form-action 'self'"].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "X-Frame-Options", value: "DENY" },
  // /api/images는 저장된 Content-Type으로 내려주므로, 브라우저가 내용을 보고 HTML 등으로 바꿔 읽지 않게 한다.
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
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
