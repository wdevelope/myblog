import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { assertAdmin } from "@/lib/server/admin";
import { isImageBucket, PRIVATE_IMAGE_BUCKET, PUBLIC_IMAGE_BUCKET, storageObjectPath } from "@/lib/image";

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

  const objectPath = storageObjectPath(path);
  if (!isImageBucket(bucket) || !objectPath) {
    return NextResponse.json({ error: "invalid_image_key" }, { status: 400 });
  }

  if (bucket !== PUBLIC_IMAGE_BUCKET && !(await assertAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // For all buckets, fetch and return the actual data to avoid redirect issues with next/image
  const service = createSupabaseServiceClient();
  const { data: blob, error: downloadError } = await service.storage
    .from(bucket)
    .download(objectPath);

  if (downloadError || !blob) {
    return NextResponse.json({ error: "image_fetch_failed" }, { status: 404 });
  }

  // 비공개 이미지가 CDN 같은 공유 캐시에 남으면 관리자 확인 없이 다시 나갈 수 있다.
  return new Response(blob, {
    headers: {
      "Content-Type": blob.type || "image/png",
      "Cache-Control":
        bucket === PUBLIC_IMAGE_BUCKET
          ? "public, max-age=31536000, immutable"
          : "private, no-store",
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
      ? PUBLIC_IMAGE_BUCKET
      : visibility === "private"
        ? PRIVATE_IMAGE_BUCKET
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

  // 하나라도 거절할 파일이 있으면 아무것도 올리지 않는다(앞의 파일만 Storage에 남지 않게).
  // SVG는 스크립트를 담을 수 있어 공개 버킷 주소로 열면 Storage 도메인에서 실행된다.
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "이미지 파일만 업로드할 수 있어요." },
        { status: 400 }
      );
    }
    if (file.type === "image/svg+xml") {
      return NextResponse.json(
        { error: "SVG 이미지는 올릴 수 없어요." },
        { status: 400 }
      );
    }
  }

  const service = createSupabaseServiceClient();
  const keys: string[] = [];

  for (const file of files) {
    const date = new Date().toISOString().slice(0, 10);
    const ext = safeExtension(file);
    const path = `${date}/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await service.storage
      .from(bucket)
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (error) {
      console.error("이미지 업로드:", error.message);
      return NextResponse.json({ error: "이미지를 올리지 못했어요." }, { status: 500 });
    }

    keys.push(`${bucket}:${path}`);
  }

  return NextResponse.json({ keys }, { status: 200 });
}
