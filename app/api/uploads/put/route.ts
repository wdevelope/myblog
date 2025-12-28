import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { isLoggedIn } from "@/lib/server/auth";

function sanitizeKey(key: string) {
  const normalized = key.replaceAll("\\", "/");
  if (normalized.includes("..")) return null;
  if (!normalized.startsWith("uploads/") && !normalized.startsWith("private/uploads/")) {
    return null;
  }
  return normalized;
}

export async function PUT(request: Request) {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key_required" }, { status: 400 });

  const safeKey = sanitizeKey(key);
  if (!safeKey) return NextResponse.json({ error: "invalid_key" }, { status: 400 });

  const bytes = await request.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const isPrivate = safeKey.startsWith("private/uploads/");
  const outputPath = isPrivate
    ? path.join(process.cwd(), ".data", safeKey)
    : path.join(process.cwd(), "public", safeKey);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, buffer);

  return NextResponse.json({ ok: true }, { status: 200 });
}

