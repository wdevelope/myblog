import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type { Visibility } from "@/lib/types";
import { isLoggedIn } from "@/lib/server/auth";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function extFromContentType(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  return "bin";
}

export async function POST(request: Request) {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<{
    contentType: string;
    visibility: Visibility;
  }>;

  if (!body.contentType?.trim()) return badRequest("contentType is required");
  if (!body.visibility || !["public", "private"].includes(body.visibility)) {
    return badRequest("visibility must be public|private");
  }

  const id = randomUUID();
  const ext = extFromContentType(body.contentType);
  const folder = body.visibility === "public" ? "uploads" : path.join("private", "uploads");
  const key = `${folder}/${id}.${ext}`;

  const url = new URL(request.url);
  const uploadUrl = new URL("/api/uploads/put", url.origin);
  uploadUrl.searchParams.set("key", key);
  uploadUrl.searchParams.set("contentType", body.contentType);

  const publicUrl =
    body.visibility === "public" ? `/${key.replace(/^uploads\//, "uploads/")}` : null;
  const downloadUrl =
    body.visibility === "private" ? `/api/uploads/get?key=${encodeURIComponent(key)}` : null;

  return NextResponse.json(
    { key, uploadUrl: uploadUrl.toString(), url: publicUrl, downloadUrl },
    { status: 200 },
  );
}

