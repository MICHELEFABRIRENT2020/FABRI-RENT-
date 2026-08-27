import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicTenant } from "@/lib/tenant";

export async function GET() {
  const tenant = await getPublicTenant();
  const extras = await prisma.extraService.findMany({
    where: { tenantId: tenant.id, active: true },
    orderBy: { label: "asc" },
  });
  return NextResponse.json({ extras });
}
