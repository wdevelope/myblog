import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/server/admin";

export const runtime = "nodejs";

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

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

export async function POST(request: Request) {
  const url = new URL(request.url);
  await requireAdmin(url.pathname);

  const form = await request.formData();
  const visibility = (form.get("visibility") ?? "").toString();
  const bucket =
    visibility === "public"
      ? "post-images-public"
      : visibility === "private"
        ? "post-images-private"
        : null;

  if (!bucket) {
    return NextResponse.json(
      { error: "공개 범위(visibility)는 public 또는 private 이어야 합니다." },
      { status: 400 },
    );
  }

  const files = form.getAll("files").filter((v): v is File => v instanceof File);
  if (!files.length) {
    return NextResponse.json({ error: "업로드할 파일이 없습니다." }, { status: 400 });
  }

  const service = createSupabaseServiceClient();
  const keys: string[] = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "이미지 파일만 업로드할 수 있어요." },
        { status: 400 },
      );
    }

    const path = `${new Date().toISOString().slice(0, 10)}/${uuid()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await service.storage
      .from(bucket)
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (error) {
      return NextResponse.json({ error: "upload_failed", details: error.message }, { status: 500 });
    }

    keys.push(`${bucket}:${path}`);
  }

  return NextResponse.json({ keys }, { status: 200 });
}
