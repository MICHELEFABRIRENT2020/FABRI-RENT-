import { describe, it, expect } from "vitest";
import { generate } from "otplib";
import { generateTotpSecret, verifyTotpToken, generateBackupCodes, hashBackupCodes, consumeBackupCode } from "@/lib/totp";

describe("TOTP secret + verification roundtrip", () => {
  it("verifies a token generated from the same secret", async () => {
    const secret = generateTotpSecret();
    const token = await generate({ secret });
    expect(await verifyTotpToken(secret, token)).toBe(true);
  });

  it("rejects a token from a different secret", async () => {
    const secret = generateTotpSecret();
    const otherToken = await generate({ secret: generateTotpSecret() });
    expect(await verifyTotpToken(secret, otherToken)).toBe(false);
  });

  it("rejects malformed input without throwing", async () => {
    const secret = generateTotpSecret();
    expect(await verifyTotpToken(secret, "abc")).toBe(false);
    expect(await verifyTotpToken(secret, "")).toBe(false);
    expect(await verifyTotpToken(secret, "12345")).toBe(false);
  });

  it("generates two different secrets on repeated calls", () => {
    expect(generateTotpSecret()).not.toBe(generateTotpSecret());
  });
});

describe("backup codes", () => {
  it("generates 8 unique codes", () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
  });

  it("consumes a matching code exactly once and leaves the rest untouched", async () => {
    const codes = generateBackupCodes();
    const hashed = await hashBackupCodes(codes);

    const remaining = await consumeBackupCode(hashed, codes[3]);
    expect(remaining).not.toBeNull();
    expect(remaining).toHaveLength(7);

    // the same code can no longer be consumed from the updated list
    const secondAttempt = await consumeBackupCode(remaining!, codes[3]);
    expect(secondAttempt).toBeNull();
  });

  it("returns null for a code that was never issued", async () => {
    const codes = generateBackupCodes();
    const hashed = await hashBackupCodes(codes);
    expect(await consumeBackupCode(hashed, "ZZZZZ-ZZZZZ")).toBeNull();
  });
});
