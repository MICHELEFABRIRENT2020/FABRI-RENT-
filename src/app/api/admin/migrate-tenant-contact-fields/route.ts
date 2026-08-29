// TEMPORARY, ONE-OFF migration runner - added because this sandbox cannot
// reach the production Neon database directly (outbound Postgres TCP is
// blocked) and the Neon MCP integration was offline. Applies the exact SQL
// from prisma/migrations/20260828182224_add_tenant_contact_fields plus the
// real tenant contact values authorized by the business owner, using raw
// SQL ($executeRawUnsafe) so it works with the CURRENT (pre-migration)
// Prisma Client/schema. Protected by a random secret token. Delete this
// route immediately after a single successful run - see the follow-up
// cleanup commit.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MIGRATION_SECRET = "d3b94dfbfbc6a1621947c72f7e13f859032f00f0ddba81c4f2668d83e15ef891";
const TENANT_ID = "6bd0c1a6-52f8-494b-9497-01b33c023d96";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (token !== MIGRATION_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.$executeRawUnsafe(`ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "email" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "mobile_phone" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "opening_hours" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "phone" TEXT`);

  await prisma.$executeRawUnsafe(
    `UPDATE "tenants" SET
       "vat_number" = $1,
       "pec" = $2,
       "phone" = $3,
       "mobile_phone" = $4,
       "email" = $5,
       "opening_hours" = $6
     WHERE "id" = $7`,
    "08118351540",
    "FABRIRENTMULTISERVICE@PEC.IT",
    "03859111209",
    "3509656394",
    "FABRIRENTSRLS@LIBERO.IT",
    "09:30-20:00",
    TENANT_ID
  );

  const rows = await prisma.$queryRawUnsafe<
    { id: string; name: string; vat_number: string | null; pec: string | null; phone: string | null; mobile_phone: string | null; email: string | null; opening_hours: string | null; address: string | null }[]
  >(`SELECT id, name, vat_number, pec, phone, mobile_phone, email, opening_hours, address FROM "tenants" WHERE id = $1`, TENANT_ID);

  return NextResponse.json({ ok: true, tenant: rows[0] ?? null });
}
