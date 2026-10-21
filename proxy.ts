import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { articleListHref } from "@/lib/constants";

export async function proxy(request: NextRequest) {
  const legacy = legacyArticleListRedirect(request);
  if (legacy) return legacy;

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
  // getUser는 요청마다 Auth 서버를 왕복한다. getClaims는 ES256 서명을 JWKS(전역 캐시)로 로컬 검증하고,
  // 만료된 토큰만 getSession 안에서 갱신한다.
  await supabase.auth.getClaims();

  return response;
}

// /article 목록을 경로 기반 정적 페이지로 옮겨(5단계) 옛 쿼리 주소(?category=·?page=)를 새 경로로 보낸다.
// next.config redirects는 한글 쿼리 값을 인코딩하지 않은 채 Location에 넣어 500이 나서 여기서 한다.
function legacyArticleListRedirect(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname !== "/article" || (!searchParams.has("category") && !searchParams.has("page"))) {
    return null;
  }
  const page = Number(searchParams.get("page") ?? "1");
  const target = articleListHref(searchParams.get("category"), Number.isInteger(page) ? page : 1);
  return NextResponse.redirect(new URL(target, request.url), 308);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
