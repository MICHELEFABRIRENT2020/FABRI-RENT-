/**
 * Magic-byte sniffing for uploaded files (section 11: file upload
 * validation). The browser-supplied `File.type` is just a client-asserted
 * MIME string and is trivial to spoof, so every upload endpoint that
 * whitelists MIME types must also verify the actual file signature before
 * trusting it.
 */
const SIGNATURES: { type: string; check: (buf: Buffer) => boolean }[] = [
  { type: "image/jpeg", check: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    type: "image/png",
    check: (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    type: "image/webp",
    check: (b) => b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
  },
  { type: "application/pdf", check: (b) => b.length > 4 && b.toString("ascii", 0, 4) === "%PDF" },
];

export function sniffMimeType(buffer: Buffer): string | null {
  return SIGNATURES.find((sig) => sig.check(buffer))?.type ?? null;
}

/**
 * Returns true only if the file's actual content matches one of the
 * allowed types AND matches the type the client declared (prevents a
 * ".pdf" upload whose bytes are actually an HTML/script payload, or a
 * mismatched extension/content-type pair).
 */
export function isValidUpload(buffer: Buffer, declaredType: string, allowed: ReadonlySet<string>): boolean {
  if (!allowed.has(declaredType)) return false;
  const sniffed = sniffMimeType(buffer);
  return sniffed !== null && sniffed === declaredType;
}
