// Never statically prerendered/cached - every route here reads request-time state (session, DB, query params) or must run per-request.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertTenant, STAFF_ROLES } from "@/lib/session";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  let tenantId: string;
  try {
    const session = await assertTenant();
    if (!STAFF_ROLES.includes(session.user.role)) throw new Error("Non autorizzato");
    tenantId = session.tenantId;
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const limit = await rateLimit("search-customers", `${tenantId}:${clientIp(req.headers)}`, RATE_LIMITS.publicApi);
  if (!limit.allowed) return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const customers = await prisma.user.findMany({
    where: {
      tenantId,
      role: "client",
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 10,
    orderBy: { fullName: "asc" },
  });

  return NextResponse.json({
    results: customers.map((c) => ({ id: c.id, fullName: c.fullName, email: c.email, phone: c.phone })),
  });
}
