import { NextRequest, NextResponse } from "next/server";
import { saveFile } from "@/lib/storage";

const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const ALLOWED_FOLDERS = new Set(["documents", "damage-photos"]);

export async function POST(req: NextRequest) {
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
  const relativeUrl = await saveFile({ buffer, originalName: file.name, folder });
  const url = new URL(relativeUrl, req.nextUrl.origin).toString();

  return NextResponse.json({ url });
}
