import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AUTH_ID_TOKEN_COOKIE } from "@/lib/auth/constants";

function isLoggedIn(request: NextRequest) {
  return Boolean(request.cookies.get(AUTH_ID_TOKEN_COOKIE)?.value);
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/diary") || pathname.startsWith("/admin")) {
    if (!isLoggedIn(request)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/auth/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("from", `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/diary/:path*", "/admin/:path*"],
};

