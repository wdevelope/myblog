import { cookies } from "next/headers";
import { AUTH_ID_TOKEN_COOKIE } from "@/lib/auth/constants";

export async function isLoggedIn() {
  const cookieStore = await cookies();
  return Boolean(cookieStore.get(AUTH_ID_TOKEN_COOKIE)?.value);
}

