import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          request.cookies.set(cookie.name, cookie.value);
          response.cookies.set(cookie.name, cookie.value, cookie.options);
        }
      },
    },
  });

  // [PERF] 쿠키가 아예 없는 방문자(Guest)는 Supabase 서버와의 통신을 건너뛰어 TTFB를 단축합니다.
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some((c) => c.name.startsWith("sb-"));

  if (hasAuthCookie) {
    // Ensure auth cookies are refreshed before Server Components run.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // [PERF] 다음 Server Component에서 중복 호출을 피할 수 있도록 헤더에 유저 정보를 심습니다.
      response.headers.set("x-user-id", user.id);
      if (user.email) response.headers.set("x-user-email", user.email);

      // Custom Claims 또는 기본 metadata에 is_admin이 있다면 이를 전달합니다.
      const isAdmin = user.app_metadata?.is_admin || user.user_metadata?.is_admin;
      if (isAdmin) {
        response.headers.set("x-user-is-admin", "true");
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
