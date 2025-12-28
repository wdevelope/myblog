import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/server/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const bucket = url.searchParams.get("bucket");
  const path = url.searchParams.get("path");
  if (!bucket || !path) {
    return NextResponse.json(
      { error: "bucket_and_path_required" },
      { status: 400 },
    );
  }

  await requireAdmin(url.pathname);

  const service = createSupabaseServiceClient();
  const { data, error } = await service.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 10);
  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: "signed_url_failed", details: error?.message },
      { status: 500 },
    );
  }

  return NextResponse.redirect(data.signedUrl);
}

