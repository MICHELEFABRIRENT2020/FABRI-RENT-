import crypto from "node:crypto";

/**
 * Encrypt-at-rest helper for secrets that must be stored in the database
 * and later read back in cleartext by the server (unlike passwords, which
 * are one-way hashed) - currently only the TOTP secret
 * (`User.twoFactorSecret`).
 *
 * The encryption key is derived from `AUTH_SECRET` via scrypt. This is a
 * pragmatic choice for a single-tenant-deployment-per-instance app without
 * a KMS: it means anyone with `AUTH_SECRET` (already the key to forging
 * sessions) can also decrypt 2FA secrets, so it does not protect against a
 * full application compromise - but it does mean a database-only leak
 * (backup, read replica, SQL injection) does not hand over 2FA secrets in
 * cleartext. Rotate `AUTH_SECRET` -> re-enroll 2FA if it is ever exposed.
 */
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function deriveKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET non configurato: richiesto per cifrare/decifrare i segreti 2FA.");
  }
  return crypto.scryptSync(secret, "fabrigroup-2fa-secret-v1", 32);
}

export function encryptSecret(plaintext: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptSecret(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Formato segreto cifrato non valido.");
  const key = deriveKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
}
