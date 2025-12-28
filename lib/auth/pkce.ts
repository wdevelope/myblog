import { randomBytes, createHash } from "node:crypto";

function base64UrlEncode(input: Buffer) {
  return input
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function createPkcePair() {
  const verifier = base64UrlEncode(randomBytes(32));
  const challenge = base64UrlEncode(
    createHash("sha256").update(verifier).digest(),
  );
  return { verifier, challenge };
}

export function createState() {
  return base64UrlEncode(randomBytes(16));
}

