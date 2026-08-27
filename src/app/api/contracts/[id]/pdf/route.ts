import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertTenant, STAFF_ROLES } from "@/lib/session";
import { generateRentalContractPdf } from "@/lib/pdf";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let tenantId: string;
  try {
    const session = await assertTenant();
    if (!STAFF_ROLES.includes(session.user.role)) throw new Error("Non autorizzato");
    tenantId = session.tenantId;
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const booking = await prisma.booking.findFirst({
    where: { id, tenantId },
    include: { user: true, vehicle: true, tenant: true },
  });
  if (!booking) return NextResponse.json({ error: "Contratto non trovato" }, { status: 404 });

  const franchigie = [
    { label: "RCA", amount: Number(booking.tenant.franchigiaRcaAmount), percent: Number(booking.tenant.franchigiaRcaPercent) },
    { label: "Kasko", amount: Number(booking.tenant.franchigiaKaskoAmount), percent: Number(booking.tenant.franchigiaKaskoPercent) },
    { label: "Furto", amount: Number(booking.tenant.franchigiaFurtoAmount), percent: Number(booking.tenant.franchigiaFurtoPercent) },
    { label: "Incendio", amount: Number(booking.tenant.franchigiaIncendioAmount), percent: Number(booking.tenant.franchigiaIncendioPercent) },
    { label: "Danni", amount: Number(booking.tenant.franchigiaDanniAmount), percent: Number(booking.tenant.franchigiaDanniPercent) },
  ];

  const authorizedDrivers = Array.isArray(booking.authorizedDrivers)
    ? (booking.authorizedDrivers as { fullName: string; licenseNumber?: string }[])
    : [];

  const pdfBytes = await generateRentalContractPdf({
    companyName: booking.tenant.name,
    companyVatNumber: booking.tenant.vatNumber,
    location: booking.location,
    contractNumber: booking.contractNumber,
    bookingId: booking.id,
    customerName: booking.user.fullName,
    customerFiscalCode: booking.user.idCardNumber,
    vehicleName: booking.vehicle?.name ?? "-",
    plate: booking.vehicle?.plate ?? null,
    startDate: booking.startDate,
    endDate: booking.endDate,
    totalPrice: Number(booking.priceOverride ?? booking.totalPrice),
    depositAmount: Number(booking.depositAmount),
    franchigie,
    authorizedDrivers,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="contratto-${booking.contractNumber ?? booking.id}.pdf"`,
    },
  });
}
