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
  if (q.length < 2) return NextResponse.json({ results: [] });

  const bookings = await prisma.booking.findMany({
    where: {
      tenantId,
      OR: [
        { user: { fullName: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
        { vehicle: { plate: { contains: q, mode: "insensitive" } } },
        { id: q.length > 8 ? q : undefined },
      ],
    },
    include: { user: true, vehicle: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({
    results: bookings.map((b) => ({
      bookingId: b.id,
      contractNumber: b.contractNumber,
      customerId: b.userId,
      customerName: b.user.fullName,
      vehicleId: b.vehicleId,
      vehicleName: b.vehicle?.name ?? null,
      plate: b.vehicle?.plate ?? null,
    })),
  });
}
