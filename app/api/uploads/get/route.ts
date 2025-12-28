import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { isLoggedIn } from "@/lib/server/auth";

function sanitizeKey(key: string) {
  const normalized = key.replaceAll("\\", "/");
  if (normalized.includes("..")) return null;
  if (!normalized.startsWith("private/uploads/")) return null;
  return normalized;
}

export async function GET(request: Request) {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key_required" }, { status: 400 });

  const safeKey = sanitizeKey(key);
  if (!safeKey) return NextResponse.json({ error: "invalid_key" }, { status: 400 });

  const filePath = path.join(process.cwd(), ".data", safeKey);
  try {
    const data = await fs.readFile(filePath);
    return new NextResponse(data, {
      status: 200,
      headers: {
        "content-type": "application/octet-stream",
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}

