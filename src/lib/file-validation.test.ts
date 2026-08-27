import { describe, it, expect } from "vitest";
import { sniffMimeType, isValidUpload } from "@/lib/file-validation";

const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const PDF_HEADER = Buffer.from("%PDF-1.4\n...");
const WEBP_HEADER = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBP"), Buffer.from([0x56, 0x50, 0x38])]);
const HTML_PAYLOAD = Buffer.from("<script>alert(1)</script>");

describe("sniffMimeType", () => {
  it("recognizes real JPEG/PNG/WEBP/PDF magic bytes", () => {
    expect(sniffMimeType(JPEG_HEADER)).toBe("image/jpeg");
    expect(sniffMimeType(PNG_HEADER)).toBe("image/png");
    expect(sniffMimeType(WEBP_HEADER)).toBe("image/webp");
    expect(sniffMimeType(PDF_HEADER)).toBe("application/pdf");
  });

  it("returns null for content that isn't any known signature", () => {
    expect(sniffMimeType(HTML_PAYLOAD)).toBeNull();
    expect(sniffMimeType(Buffer.alloc(0))).toBeNull();
  });
});

describe("isValidUpload", () => {
  const allowed = new Set(["image/jpeg", "image/png", "application/pdf"]);

  it("accepts a file whose real content matches its declared, allowed type", () => {
    expect(isValidUpload(JPEG_HEADER, "image/jpeg", allowed)).toBe(true);
  });

  it("rejects a declared type outside the allow-list even if genuine", () => {
    expect(isValidUpload(WEBP_HEADER, "image/webp", allowed)).toBe(false);
  });

  it("rejects spoofed content - an HTML payload declared as a PDF", () => {
    expect(isValidUpload(HTML_PAYLOAD, "application/pdf", allowed)).toBe(false);
  });

  it("rejects a mismatched declared vs. actual type (real PNG declared as JPEG)", () => {
    expect(isValidUpload(PNG_HEADER, "image/jpeg", allowed)).toBe(false);
  });
});
