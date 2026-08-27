import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertTenant, STAFF_ROLES } from "@/lib/session";
import { generateAppealPdf } from "@/lib/pdf";

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

  const fine = await prisma.fine.findFirst({
    where: { id, tenantId },
    include: { tenant: true, contract: { include: { user: true } }, issuingAuthority: true },
  });
  if (!fine) return NextResponse.json({ error: "Multa non trovata" }, { status: 404 });
  if (!fine.contract) {
    return NextResponse.json({ error: "Nessun contratto associato: impossibile generare il ricorso." }, { status: 400 });
  }

  const pdfBytes = await generateAppealPdf({
    companyName: fine.tenant.name,
    companyVatNumber: fine.tenant.vatNumber,
    companyAddress: fine.tenant.address,
    customerName: fine.contract.user.fullName,
    customerFiscalCode: fine.contract.user.idCardNumber,
    contractNumber: fine.contract.contractNumber,
    bookingId: fine.contract.id,
    plate: fine.plate,
    verbaleNumber: fine.verbaleNumber,
    violationDate: fine.violationDate,
    issuingAuthorityName: fine.issuingAuthority?.name ?? "Ente Verbalizzante",
    createdAt: new Date(),
  });

  await prisma.fine.update({ where: { id }, data: { status: "in_ricorso" } });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ricorso-${fine.verbaleNumber}.pdf"`,
    },
  });
}
