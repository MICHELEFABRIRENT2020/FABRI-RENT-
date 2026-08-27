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
  const plate = searchParams.get("plate")?.trim();
  const date = searchParams.get("date");

  if (!plate) return NextResponse.json({ error: "Targa mancante" }, { status: 400 });

  const violationDate = date ? new Date(date) : new Date();

  const booking = await prisma.booking.findFirst({
    where: {
      tenantId,
      vehicle: { plate: { equals: plate, mode: "insensitive" } },
      startDate: { lte: violationDate },
      endDate: { gte: violationDate },
    },
    include: { user: true, vehicle: true },
    orderBy: { startDate: "desc" },
  });

  if (!booking) return NextResponse.json({ found: false });

  return NextResponse.json({
    found: true,
    bookingId: booking.id,
    contractNumber: booking.contractNumber,
    customerId: booking.userId,
    customerName: booking.user.fullName,
    vehicleId: booking.vehicleId,
    vehicleName: booking.vehicle?.name ?? null,
  });
}
