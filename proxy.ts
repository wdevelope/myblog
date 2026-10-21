import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function proxy(request: NextRequest) {
  // 세션 쿠키가 없는 방문자는 갱신할 세션이 없으므로 Supabase 왕복을 건너뛴다.
  if (!request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          request.cookies.set(cookie.name, cookie.value);
        }
        // NextResponse.next는 생성 시점의 요청 헤더를 복사하므로, 갱신한 토큰을 이번 요청의
        // 서버 컴포넌트에 넘기려면 바뀐 요청으로 응답을 다시 만든다.
        response = NextResponse.next({ request });
        for (const cookie of cookiesToSet) {
          response.cookies.set(cookie.name, cookie.value, cookie.options);
        }
      },
    },
  });

  // 서버 컴포넌트가 돌기 전에 만료된 액세스 토큰을 갱신한다. 판정은 서버 컴포넌트·액션의 getViewer가 한다.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
