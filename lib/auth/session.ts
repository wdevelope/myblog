import { cookies } from "next/headers";
import {
  AUTH_ACCESS_TOKEN_COOKIE,
  AUTH_ID_TOKEN_COOKIE,
} from "@/lib/auth/constants";

export async function getAuthTokens() {
  const cookieStore = await cookies();
  return {
    accessToken: cookieStore.get(AUTH_ACCESS_TOKEN_COOKIE)?.value,
    idToken: cookieStore.get(AUTH_ID_TOKEN_COOKIE)?.value,
  };
}

export async function isLoggedIn() {
  const { idToken } = await getAuthTokens();
  return Boolean(idToken);
}

