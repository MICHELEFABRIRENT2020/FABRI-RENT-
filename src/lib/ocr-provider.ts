/**
 * OCR / AI Vision document scanning provider abstraction (section 3).
 *
 * Extracts structured fields from a scanned ID card, driving licence,
 * libretto, or generic PDF. Without a configured provider (AI_VISION_API_KEY)
 * this returns `{ ok: false }` so the UI can always fall back to
 * "Nuovo / Inserimento manuale" as required by the spec - it never invents
 * data. Swap `extractDocumentFields` for a real Vision API call (Claude
 * Vision, Google Document AI, Azure Document Intelligence, etc.) once
 * credentials are available (see .env.example).
 */

export type ScannedDocumentKind =
  | "id_card"
  | "driver_license"
  | "passport"
  | "fiscal_code"
  | "libretto"
  | "voucher"
  | "contract"
  | "generic";

export interface ExtractedPersonFields {
  firstName?: string;
  lastName?: string;
  fiscalCode?: string;
  birthDate?: string;
  birthPlace?: string;
  address?: string;
  postalCode?: string;
  municipality?: string;
  province?: string;
  country?: string;
  phone?: string;
  email?: string;
  // Driver's license
  licenseNumber?: string;
  licenseIssuer?: string;
  licenseIssueDate?: string;
  licenseExpiryDate?: string;
  // ID card
  documentNumber?: string;
  documentIssuedBy?: string;
  documentIssueDate?: string;
  documentExpiryDate?: string;
}

export type OcrResult = { ok: true; fields: ExtractedPersonFields } | { ok: false; reason: string };

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- buffer/mimeType/kind will be sent to the Vision provider once one is wired up
export async function extractDocumentFields(params: {
  buffer: Buffer;
  mimeType: string;
  kind: ScannedDocumentKind;
}): Promise<OcrResult> {
  const apiKey = process.env.AI_VISION_API_KEY;
  if (!apiKey) {
    return { ok: false, reason: "Scansione AI non configurata (AI_VISION_API_KEY mancante). Inserimento manuale richiesto." };
  }

  // TODO: call the real Vision provider here once credentials are available,
  // parsing its response into ExtractedPersonFields.
  return { ok: false, reason: "Provider AI Vision non ancora implementato." };
}
