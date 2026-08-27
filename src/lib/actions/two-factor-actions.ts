"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { encryptSecret, decryptSecret } from "@/lib/crypto-secret";
import {
  generateTotpSecret,
  generateEnrollmentQrDataUrl,
  verifyTotpToken,
  generateBackupCodes,
  hashBackupCodes,
} from "@/lib/totp";

/**
 * Starts (or restarts) TOTP enrollment: generates a new secret, stores it
 * encrypted but NOT yet enabled (twoFactorEnabled stays false until the
 * user proves they can generate a valid code with `confirmTwoFactorEnrollment`),
 * and returns a QR code the user scans with an authenticator app.
 */
export async function beginTwoFactorEnrollment(): Promise<{ qrDataUrl: string; secret: string }> {
  const user = await requireUser();
  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorSecret: encryptSecret(secret), twoFactorEnabled: false } });
  const qrDataUrl = await generateEnrollmentQrDataUrl(user.email ?? user.id, secret);
  return { qrDataUrl, secret };
}

export async function confirmTwoFactorEnrollment(token: string): Promise<{ backupCodes: string[] }> {
  const user = await requireUser();
  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!dbUser.twoFactorSecret) throw new Error("Nessun enrollment 2FA in corso. Ricomincia dal QR code.");

  const valid = await verifyTotpToken(decryptSecret(dbUser.twoFactorSecret), token.trim());
  if (!valid) throw new Error("Codice non valido. Controlla l'app authenticator e riprova.");

  const backupCodes = generateBackupCodes();
  const hashed = await hashBackupCodes(backupCodes);

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: true, twoFactorBackupCodes: hashed },
  });
  await logAudit({ tenantId: user.tenantId, actorId: user.id, action: "2fa_enabled", entityType: "user", entityId: user.id });
  revalidatePath("/account/sicurezza");
  return { backupCodes };
}

export async function disableTwoFactor(password: string): Promise<void> {
  const user = await requireUser();
  const bcrypt = await import("bcryptjs");
  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!dbUser.passwordHash || !(await bcrypt.compare(password, dbUser.passwordHash))) {
    throw new Error("Password errata.");
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: [] },
  });
  await logAudit({ tenantId: user.tenantId, actorId: user.id, action: "2fa_disabled", entityType: "user", entityId: user.id });
  revalidatePath("/account/sicurezza");
}

export async function getTwoFactorStatus(): Promise<{ enabled: boolean; remainingBackupCodes: number }> {
  const user = await requireUser();
  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { twoFactorEnabled: true, twoFactorBackupCodes: true } });
  return { enabled: dbUser.twoFactorEnabled, remainingBackupCodes: dbUser.twoFactorBackupCodes.length };
}
