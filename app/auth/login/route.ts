import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { createPkcePair, createState } from "@/lib/auth/pkce";
import {
  AUTH_CODE_VERIFIER_COOKIE,
  AUTH_STATE_COOKIE,
} from "@/lib/auth/constants";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { verifier, challenge } = createPkcePair();
  const state = createState();

  const requestUrl = new URL(request.url);
  const from = requestUrl.searchParams.get("from");

  const cookieStore = await cookies();
  cookieStore.set(AUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
  cookieStore.set(AUTH_CODE_VERIFIER_COOKIE, verifier, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
  if (from) {
    cookieStore.set("post_login_redirect", from, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 10 * 60,
    });
  }

  const cognitoDomain = env.requireServer.cognitoDomain();
  const clientId = env.requireServer.cognitoClientId();
  const redirectUri = env.requireServer.cognitoRedirectUri();

  const authorizeUrl = new URL(`https://${cognitoDomain}/oauth2/authorize`);
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "openid email profile");
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  return NextResponse.redirect(authorizeUrl);
}
