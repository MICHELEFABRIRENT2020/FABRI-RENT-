import crypto from "node:crypto";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import { generateSecret, generateURI, verify } from "otplib";

/**
 * TOTP 2FA (RFC 6238, Google/Microsoft/Authy-Authenticator compatible),
 * section 8. `otplib`'s functional API does the actual HMAC/base32 work;
 * this module adds the app-specific pieces: enrollment QR, backup codes,
 * and epoch tolerance policy.
 */
const ISSUER = "FabriGroup Rent Manager";
const BACKUP_CODE_COUNT = 8;

export function generateTotpSecret(): string {
  return generateSecret();
}

export async function generateEnrollmentQrDataUrl(email: string, secret: string): Promise<string> {
  const uri = generateURI({ issuer: ISSUER, label: email, secret });
  return QRCode.toDataURL(uri);
}

/**
 * `epochTolerance: 30` accepts the previous/next 30s step in addition to
 * the current one, absorbing clock drift between the server and the
 * user's phone without materially weakening the 6-digit code's entropy.
 */
export async function verifyTotpToken(secret: string, token: string): Promise<boolean> {
  if (!/^\d{6}$/.test(token)) return false;
  const result = await verify({ secret, token, epochTolerance: 30 });
  return result.valid;
}

export function generateBackupCodes(): string[] {
  return Array.from({ length: BACKUP_CODE_COUNT }, () => {
    const bytes = crypto.randomBytes(5);
    return bytes.toString("hex").toUpperCase().match(/.{1,5}/g)!.join("-"); // e.g. "A1B2C-3D4E5"
  });
}

export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((code) => bcrypt.hash(code, 10)));
}

/**
 * Consumes one matching backup code (single-use). Returns the updated
 * hash list with the used code removed, or null if none matched.
 */
export async function consumeBackupCode(hashedCodes: string[], candidate: string): Promise<string[] | null> {
  for (let i = 0; i < hashedCodes.length; i++) {
    if (await bcrypt.compare(candidate.trim().toUpperCase(), hashedCodes[i])) {
      return [...hashedCodes.slice(0, i), ...hashedCodes.slice(i + 1)];
    }
  }
  return null;
}
