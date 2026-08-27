import "dotenv/config";
import { PrismaClient } from "../../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  const userId = process.argv[2];
  if (!userId) throw new Error("usage: teardown-user.ts <userId>");
  await prisma.auditLog.deleteMany({ where: { actorId: userId } });
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
