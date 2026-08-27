// Never statically prerendered/cached - every route here reads request-time state (session, DB, query params) or must run per-request.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertTenant, ADMIN_ROLES } from "@/lib/session";

function csvEscape(value: unknown): string {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function GET(req: NextRequest) {
  let tenantId: string;
  try {
    const session = await assertTenant();
    if (!ADMIN_ROLES.includes(session.user.role) && session.user.role !== "contabilita") {
      throw new Error("Non autorizzato");
    }
    tenantId = session.tenantId;
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const bookings = await prisma.booking.findMany({
    where: {
      tenantId,
      createdAt: {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(to) : undefined,
      },
    },
    include: { user: true, vehicle: true },
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "ID",
    "Cliente",
    "Email",
    "Servizio",
    "Veicolo/Parcheggio",
    "Ritiro",
    "Riconsegna",
    "Totale (EUR)",
    "Cauzione (EUR)",
    "Stato pagamento",
    "Stato",
    "Creato il",
  ];

  const rows = bookings.map((b) => [
    b.id,
    b.user.fullName,
    b.user.email,
    b.serviceType,
    b.serviceType === "rent" ? b.vehicle?.name ?? "" : `Parcheggio ${b.parkingCategory ?? ""} ${b.parkingType ?? ""}`,
    b.startDate.toISOString(),
    b.endDate.toISOString(),
    Number(b.priceOverride ?? b.totalPrice).toFixed(2),
    Number(b.depositAmount).toFixed(2),
    b.paymentStatus,
    b.status,
    b.createdAt.toISOString(),
  ]);

  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="prenotazioni-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
