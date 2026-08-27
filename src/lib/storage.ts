import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

/**
 * File storage abstraction. Default implementation writes to /public/uploads
 * on local disk so document/photo uploads work out of the box without cloud
 * credentials. Swap `saveFile` for an S3/Cloud Storage client before
 * deploying to a serverless/ephemeral-filesystem target (see .env.example).
 */
const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

export async function saveFile(params: {
  buffer: Buffer;
  originalName: string;
  folder: string;
}): Promise<string> {
  const ext = path.extname(params.originalName) || "";
  const filename = `${crypto.randomUUID()}${ext}`;
  const dir = path.join(UPLOAD_ROOT, params.folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), params.buffer);
  return `/uploads/${params.folder}/${filename}`;
}
