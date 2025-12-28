import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import {
  AUTH_ACCESS_TOKEN_COOKIE,
  AUTH_CODE_VERIFIER_COOKIE,
  AUTH_ID_TOKEN_COOKIE,
  AUTH_REFRESH_TOKEN_COOKIE,
  AUTH_STATE_COOKIE,
} from "@/lib/auth/constants";

export const runtime = "nodejs";

const POST_LOGIN_REDIRECT_COOKIE = "post_login_redirect";

function buildCookieOptions(maxAgeSeconds?: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(maxAgeSeconds ? { maxAge: maxAgeSeconds } : null),
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    return NextResponse.json(
      { error, errorDescription },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: "missing_code_or_state" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(AUTH_STATE_COOKIE)?.value;
  const codeVerifier = cookieStore.get(AUTH_CODE_VERIFIER_COOKIE)?.value;

  if (!expectedState || expectedState !== state || !codeVerifier) {
    return NextResponse.json(
      { error: "invalid_state" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const cognitoDomain = env.requireServer.cognitoDomain();
  const clientId = env.requireServer.cognitoClientId();
  const redirectUri = env.requireServer.cognitoRedirectUri();

  const tokenUrl = `https://${cognitoDomain}/oauth2/token`;
  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("client_id", clientId);
  body.set("code", code);
  body.set("redirect_uri", redirectUri);
  body.set("code_verifier", codeVerifier);

  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text();
    return NextResponse.json(
      { error: "token_exchange_failed", details: text },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }

  const tokenJson: unknown = await tokenResponse.json();
  const tokens = tokenJson as {
    access_token?: string;
    id_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
  };

  if (!tokens.access_token || !tokens.id_token) {
    return NextResponse.json(
      { error: "missing_tokens" },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }

  cookieStore.delete(AUTH_STATE_COOKIE);
  cookieStore.delete(AUTH_CODE_VERIFIER_COOKIE);

  const maxAge = tokens.expires_in ?? 60 * 60;
  cookieStore.set(AUTH_ACCESS_TOKEN_COOKIE, tokens.access_token, {
    ...buildCookieOptions(maxAge),
  });
  cookieStore.set(AUTH_ID_TOKEN_COOKIE, tokens.id_token, {
    ...buildCookieOptions(maxAge),
  });
  if (tokens.refresh_token) {
    cookieStore.set(AUTH_REFRESH_TOKEN_COOKIE, tokens.refresh_token, {
      ...buildCookieOptions(30 * 24 * 60 * 60),
    });
  }

  const redirectTo = cookieStore.get(POST_LOGIN_REDIRECT_COOKIE)?.value;
  if (redirectTo) cookieStore.delete(POST_LOGIN_REDIRECT_COOKIE);
  return NextResponse.redirect(new URL(redirectTo || "/diary", url.origin));
}
