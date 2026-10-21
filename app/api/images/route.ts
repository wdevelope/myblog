import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { assertAdmin } from "@/lib/server/admin";

export const runtime = "nodejs";

function safeExtension(file: File) {
  const fromType = file.type.split("/")[1]?.trim().toLowerCase();
  const fromName = file.name.split(".").pop()?.trim().toLowerCase();
  const candidate = fromType || fromName || "";
  if (!candidate) return "bin";
  return candidate.replaceAll(/[^a-z0-9]+/g, "").slice(0, 10) || "bin";
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const bucket = url.searchParams.get("bucket");
  const path = url.searchParams.get("path");
  if (!bucket || !path) {
    return NextResponse.json(
      { error: "bucket_and_path_required" },
      { status: 400 }
    );
  }

  if (bucket !== "post-images-public" && !(await assertAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // For all buckets, fetch and return the actual data to avoid redirect issues with next/image
  const service = createSupabaseServiceClient();
  const { data: blob, error: downloadError } = await service.storage
    .from(bucket)
    .download(path);

  if (downloadError || !blob) {
    return NextResponse.json(
      { error: "image_fetch_failed", details: downloadError?.message },
      { status: 404 }
    );
  }

  // Return the image data with proper headers
  return new Response(blob, {
    headers: {
      "Content-Type": blob.type || "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function POST(request: Request) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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
      { status: 400 }
    );
  }

  const files = form
    .getAll("files")
    .filter((v): v is File => v instanceof File);
  if (!files.length) {
    return NextResponse.json(
      { error: "업로드할 파일이 없습니다." },
      { status: 400 }
    );
  }

  const service = createSupabaseServiceClient();
  const keys: string[] = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "이미지 파일만 업로드할 수 있어요." },
        { status: 400 }
      );
    }

    const date = new Date().toISOString().slice(0, 10);
    const ext = safeExtension(file);
    const path = `${date}/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await service.storage
      .from(bucket)
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (error) {
      return NextResponse.json(
        { error: "upload_failed", details: error.message },
        { status: 500 }
      );
    }

    keys.push(`${bucket}:${path}`);
  }

  return NextResponse.json({ keys }, { status: 200 });
}
