// Never statically prerendered/cached - every route here reads request-time state (session, DB, query params) or must run per-request.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertTenant, STAFF_ROLES } from "@/lib/session";

export async function GET(req: NextRequest) {
  let tenantId: string;
  try {
    const session = await assertTenant();
    if (!STAFF_ROLES.includes(session.user.role)) throw new Error("Non autorizzato");
    tenantId = session.tenantId;
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const authorities = await prisma.issuingAuthority.findMany({
    where: { tenantId, name: { contains: q, mode: "insensitive" } },
    orderBy: { name: "asc" },
    take: 15,
  });

  return NextResponse.json({
    results: authorities.map((a) => ({ id: a.id, name: a.name, pec: a.pec, source: a.source, verifiedAt: a.verifiedAt })),
  });
}
