// Never statically prerendered/cached - every route here reads request-time state (session, DB, query params) or must run per-request.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { saveFile } from "@/lib/storage";
import { isValidUpload } from "@/lib/file-validation";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const ALLOWED_FOLDERS = new Set(["documents", "damage-photos"]);

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const limit = await rateLimit("upload", ip, RATE_LIMITS.fileUpload);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Troppe richieste, riprova tra qualche minuto." }, { status: 429 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const folder = formData.get("folder");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File mancante" }, { status: 400 });
  }
  if (typeof folder !== "string" || !ALLOWED_FOLDERS.has(folder)) {
    return NextResponse.json({ error: "Cartella di destinazione non valida" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Formato file non supportato" }, { status: 415 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File troppo grande (max 8MB)" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!isValidUpload(buffer, file.type, ALLOWED_TYPES)) {
    return NextResponse.json({ error: "Il contenuto del file non corrisponde al formato dichiarato." }, { status: 415 });
  }
  const relativeUrl = await saveFile({ buffer, originalName: file.name, folder });
  const url = new URL(relativeUrl, req.nextUrl.origin).toString();

  return NextResponse.json({ url });
}
