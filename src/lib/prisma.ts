import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Driver adapter (node-postgres + Prisma's query compiler) instead of the
// binary query engine: Vercel's serverless bundling repeatedly failed to
// include the platform-specific libquery_engine-*.so.node file alongside
// this project's custom Prisma generator output (confirmed both with and
// without an explicit binaryTargets/outputFileTracingIncludes workaround -
// see prisma/prisma#29339 for the same Next.js 16 + Vercel + custom output
// failure). The adapter has no native binary to lose in bundling.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
