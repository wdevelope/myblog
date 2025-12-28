import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import {
  AUTH_ACCESS_TOKEN_COOKIE,
  AUTH_ID_TOKEN_COOKIE,
  AUTH_REFRESH_TOKEN_COOKIE,
} from "@/lib/auth/constants";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_ACCESS_TOKEN_COOKIE);
  cookieStore.delete(AUTH_ID_TOKEN_COOKIE);
  cookieStore.delete(AUTH_REFRESH_TOKEN_COOKIE);

  const cognitoDomain = env.requireServer.cognitoDomain();
  const clientId = env.requireServer.cognitoClientId();
  const logoutRedirectUri = env.requireServer.cognitoLogoutRedirectUri();

  const url = new URL(`https://${cognitoDomain}/logout`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("logout_uri", logoutRedirectUri);

  return NextResponse.redirect(url, { headers: { "cache-control": "no-store" } });
}
