/**
 * Fixture helper for e2e/auth.spec.ts, run as a standalone `tsx` child
 * process (not imported by the spec file directly) - Playwright's own
 * test-file module transform can't load the generated Prisma client
 * (it uses import.meta, which trips Playwright's CJS-oriented loader),
 * while `tsx` handles it correctly (same tool `npm run db:seed` uses).
 * Prints {userId, secret, backupCodes} as JSON on stdout.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../../src/generated/prisma/client";
import { generateTotpSecret, generateBackupCodes, hashBackupCodes } from "../../src/lib/totp";
import { encryptSecret } from "../../src/lib/crypto-secret";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("usage: setup-2fa-user.ts <email>");

  const secret = generateTotpSecret();
  const backupCodes = generateBackupCodes();
  const passwordHash = await bcrypt.hash("TestPassword!2026", 10);
  const tenant = await prisma.tenant.findFirstOrThrow({ orderBy: { createdAt: "asc" } });

  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      fullName: "E2E 2FA User",
      email,
      phone: "+39 000 0000099",
      role: "operator",
      passwordHash,
      twoFactorEnabled: true,
      twoFactorSecret: encryptSecret(secret),
      twoFactorBackupCodes: await hashBackupCodes(backupCodes),
    },
  });

  console.log(JSON.stringify({ userId: user.id, secret, backupCodes }));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
