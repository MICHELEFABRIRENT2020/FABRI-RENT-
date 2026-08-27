import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { assertTenant, ADMIN_ROLES } from "@/lib/session";

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

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Prenotazioni");

  sheet.columns = [
    { header: "ID", key: "id", width: 38 },
    { header: "Cliente", key: "cliente", width: 24 },
    { header: "Email", key: "email", width: 26 },
    { header: "Servizio", key: "servizio", width: 12 },
    { header: "Veicolo/Parcheggio", key: "dettaglio", width: 26 },
    { header: "Ritiro", key: "ritiro", width: 20 },
    { header: "Riconsegna", key: "riconsegna", width: 20 },
    { header: "Totale (EUR)", key: "totale", width: 14 },
    { header: "Cauzione (EUR)", key: "cauzione", width: 14 },
    { header: "Stato pagamento", key: "pagamento", width: 16 },
    { header: "Stato", key: "stato", width: 14 },
    { header: "Creato il", key: "creato", width: 20 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const b of bookings) {
    sheet.addRow({
      id: b.id,
      cliente: b.user.fullName,
      email: b.user.email,
      servizio: b.serviceType,
      dettaglio:
        b.serviceType === "rent" ? b.vehicle?.name ?? "" : `Parcheggio ${b.parkingCategory ?? ""} ${b.parkingType ?? ""}`,
      ritiro: b.startDate,
      riconsegna: b.endDate,
      totale: Number(b.priceOverride ?? b.totalPrice),
      cauzione: Number(b.depositAmount),
      pagamento: b.paymentStatus,
      stato: b.status,
      creato: b.createdAt,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="prenotazioni-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
