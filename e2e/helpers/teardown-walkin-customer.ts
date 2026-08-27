import "dotenv/config";
import { PrismaClient } from "../../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("usage: teardown-walkin-customer.ts <email>");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  const bookings = await prisma.booking.findMany({ where: { userId: user.id } });
  for (const booking of bookings) {
    await prisma.bookingExtraService.deleteMany({ where: { bookingId: booking.id } });
    await prisma.payment.deleteMany({ where: { bookingId: booking.id } });
  }
  await prisma.booking.deleteMany({ where: { userId: user.id } });
  await prisma.auditLog.deleteMany({ where: { actorId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
