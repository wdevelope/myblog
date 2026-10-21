import { NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 공개 페이지가 정적으로 캐시되면 DB 요청이 거의 없어 Supabase 무료 플랜이 7일 무활동으로 일시정지된다.
// Vercel Cron이 하루 한 번 불러 캐시하지 않는 가벼운 조회로 활동을 남긴다.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { url, anonKey } = getSupabaseEnv();
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/categories?select=slug&limit=1`, {
    headers: { apikey: anonKey, authorization: `Bearer ${anonKey}` },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json({ error: "db_unreachable" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
