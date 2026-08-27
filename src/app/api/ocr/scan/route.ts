// Never statically prerendered/cached - every route here reads request-time state (session, DB, query params) or must run per-request.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getPublicTenant } from "@/lib/tenant";
import { saveFile } from "@/lib/storage";
import { extractDocumentFields, type ScannedDocumentKind } from "@/lib/ocr-provider";
import { isValidUpload } from "@/lib/file-validation";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

const MAX_SIZE_BYTES = 12 * 1024 * 1024; // 12MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const VALID_KINDS = new Set<ScannedDocumentKind>([
  "id_card",
  "driver_license",
  "passport",
  "fiscal_code",
  "libretto",
  "voucher",
  "contract",
  "generic",
]);

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const limit = await rateLimit("ocr", ip, RATE_LIMITS.fileUpload);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Troppe richieste, riprova tra qualche minuto." }, { status: 429 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const kindRaw = formData.get("kind");
  const kind = (typeof kindRaw === "string" && VALID_KINDS.has(kindRaw as ScannedDocumentKind) ? kindRaw : "generic") as ScannedDocumentKind;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File mancante" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Formato non supportato (JPG, PNG, WebP, PDF)" }, { status: 415 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File troppo grande (max 12MB)" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!isValidUpload(buffer, file.type, ALLOWED_TYPES)) {
    return NextResponse.json({ error: "Il contenuto del file non corrisponde al formato dichiarato." }, { status: 415 });
  }
  const relativeUrl = await saveFile({ buffer, originalName: file.name, folder: "documents" });
  const url = new URL(relativeUrl, req.nextUrl.origin).toString();

  const ocrResult = await extractDocumentFields({ buffer, mimeType: file.type, kind });

  const session = await auth();
  let tenantId = session?.user?.tenantId ?? null;
  if (!tenantId) tenantId = (await getPublicTenant()).id;

  const doc = await prisma.document.create({
    data: {
      tenantId,
      entityType: "scan",
      entityId: kind,
      fileUrl: url,
      fileName: file.name,
      fileType: file.type,
      ocrData: JSON.parse(JSON.stringify(ocrResult.ok ? ocrResult.fields : { error: ocrResult.reason })),
      uploadedById: session?.user?.id,
    },
  });

  return NextResponse.json({
    url,
    documentId: doc.id,
    ocr: ocrResult.ok ? { ok: true, fields: ocrResult.fields } : { ok: false, reason: ocrResult.reason },
  });
}
