import { describe, it, expect, beforeAll } from "vitest";
import { encryptSecret, decryptSecret } from "@/lib/crypto-secret";

describe("crypto-secret (AES-256-GCM roundtrip)", () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = "test-only-secret-not-for-production-use";
  });

  it("decrypts exactly what was encrypted", () => {
    const plaintext = "JBSWY3DPEHPK3PXP";
    const encrypted = encryptSecret(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });

  it("produces a different ciphertext each time (random IV) for the same plaintext", () => {
    const plaintext = "same-secret";
    expect(encryptSecret(plaintext)).not.toBe(encryptSecret(plaintext));
  });

  it("rejects a tampered ciphertext (auth tag mismatch)", () => {
    const encrypted = encryptSecret("some-secret");
    const [iv, tag, data] = encrypted.split(":");
    const tampered = [iv, tag, data.slice(0, -2) + "00"].join(":");
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("rejects a malformed payload", () => {
    expect(() => decryptSecret("not-a-valid-payload")).toThrow();
  });
});
