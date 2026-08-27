"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertTenant } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email-provider";
import { generateInvoicePdf } from "@/lib/pdf";
import { buildInvoiceXml, submitToSdi } from "@/lib/aruba";
import { saveFile } from "@/lib/storage";
import { assignVehicleForBooking } from "@/lib/fleet-engine";
import type { AppUserRole } from "@/types/next-auth";

const OPERATIONAL_ROLES: AppUserRole[] = ["super_admin", "admin", "responsabile", "operator"];
const VAT_RATE = 0.22;

function assertOperational(role: AppUserRole) {
  if (!OPERATIONAL_ROLES.includes(role)) throw new Error("Non autorizzato per questa operazione.");
}

// ---------------------------------------------------------------------------
// Close / delete / replace vehicle
// ---------------------------------------------------------------------------

export async function closeContract(bookingId: string) {
  const { user, tenantId } = await assertTenant();
  assertOperational(user.role);
  await prisma.booking.update({ where: { id: bookingId, tenantId }, data: { status: "completed" } });
  await logAudit({ tenantId, actorId: user.id, action: "contract_closed", entityType: "booking", entityId: bookingId });
  revalidatePath("/desk/contratti");
}

export async function deleteContract(bookingId: string) {
  const { user, tenantId } = await assertTenant();
  assertOperational(user.role);

  const booking = await prisma.booking.findFirstOrThrow({ where: { id: bookingId, tenantId } });
  if (booking.status !== "confirmed") {
    throw new Error("Puoi eliminare solo contratti non ancora ritirati (check-in non effettuato).");
  }

  await prisma.booking.delete({ where: { id: bookingId } });
  await logAudit({ tenantId, actorId: user.id, action: "contract_deleted", entityType: "booking", entityId: bookingId });
  revalidatePath("/desk/contratti");
}

export async function replaceContractVehicle(bookingId: string) {
  const { user, tenantId } = await assertTenant();
  assertOperational(user.role);

  const booking = await prisma.booking.findFirstOrThrow({ where: { id: bookingId, tenantId }, include: { vehicle: true } });
  if (!booking.vehicle) throw new Error("Nessun veicolo associato a questo contratto.");

  const alternative = await assignVehicleForBooking({
    tenantId,
    category: booking.vehicle.category,
    startDate: booking.startDate,
    endDate: booking.endDate,
    excludeVehicleId: booking.vehicleId ?? undefined,
  });
  if (!alternative) throw new Error("Nessun veicolo o simile disponibile per la sostituzione.");

  await prisma.booking.update({ where: { id: bookingId }, data: { vehicleId: alternative.id } });
  await logAudit({
    tenantId,
    actorId: user.id,
    action: "contract_vehicle_replaced",
    entityType: "booking",
    entityId: bookingId,
    metadata: { newVehicleId: alternative.id },
  });
  revalidatePath("/desk/contratti");
  return { newVehicleName: alternative.name };
}

// ---------------------------------------------------------------------------
// Signature (link/OTP, WhatsApp/email/SMS reminders)
// ---------------------------------------------------------------------------

export async function generateSignatureLink(bookingId: string) {
  const { user, tenantId } = await assertTenant();
  assertOperational(user.role);

  const token = crypto.randomBytes(24).toString("base64url");
  await prisma.booking.update({
    where: { id: bookingId, tenantId },
    data: { signatureLinkToken: token, signatureStatus: "link_sent", signatureSentAt: new Date() },
  });
  await logAudit({ tenantId, actorId: user.id, action: "signature_link_generated", entityType: "booking", entityId: bookingId });
  revalidatePath("/desk/contratti");
  return { token };
}

export async function sendSignatureEmail(bookingId: string, signUrl: string) {
  const { user, tenantId } = await assertTenant();
  assertOperational(user.role);

  const booking = await prisma.booking.findFirstOrThrow({ where: { id: bookingId, tenantId }, include: { user: true } });
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });

  await sendEmail({
    to: booking.user.email,
    subject: `${tenant.name} - Firma il tuo contratto di noleggio`,
    html: `<p>Gentile ${booking.user.fullName}, firma il tuo contratto al seguente link: <a href="${signUrl}">${signUrl}</a></p>`,
  });
  await logAudit({ tenantId, actorId: user.id, action: "signature_email_sent", entityType: "booking", entityId: bookingId });
}

// ---------------------------------------------------------------------------
// Proforma / Pre-fattura / Fattura (section 18)
// ---------------------------------------------------------------------------

async function buildAndPersistInvoice(bookingId: string, isProforma: boolean) {
  const { user, tenantId } = await assertTenant();
  assertOperational(user.role);

  const booking = await prisma.booking.findFirstOrThrow({ where: { id: bookingId, tenantId }, include: { user: true } });
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });

  const totalAmount = Number(booking.priceOverride ?? booking.totalPrice);
  const taxableAmount = Number((totalAmount / (1 + VAT_RATE)).toFixed(2));
  const vatAmount = Number((totalAmount - taxableAmount).toFixed(2));

  const invoiceCount = await prisma.invoice.count({ where: { tenantId } });
  const invoiceNumber = `${isProforma ? "PRO" : "FT"}-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(4, "0")}`;

  const pdfBytes = await generateInvoicePdf({
    companyName: tenant.name,
    companyVatNumber: tenant.vatNumber,
    customerName: booking.user.fullName,
    customerVatOrFiscalCode: booking.user.vatNumber ?? booking.user.idCardNumber,
    invoiceNumber,
    bookingId: booking.id,
    taxableAmount,
    vatAmount,
    totalAmount,
    isProforma,
    createdAt: new Date(),
  });
  const pdfUrl = await saveFile({ buffer: Buffer.from(pdfBytes), originalName: `${invoiceNumber}.pdf`, folder: "documents" });

  return { user, tenantId, booking, tenant, totalAmount, taxableAmount, vatAmount, invoiceNumber, pdfUrl };
}

export async function createProforma(bookingId: string) {
  const { pdfUrl } = await buildAndPersistInvoice(bookingId, true);
  return { pdfUrl };
}

export async function sendInvoice(bookingId: string) {
  const { user, tenantId, booking, tenant, totalAmount, taxableAmount, vatAmount, invoiceNumber, pdfUrl } =
    await buildAndPersistInvoice(bookingId, false);

  const xml = buildInvoiceXml({
    invoiceNumber,
    companyName: tenant.name,
    companyVatNumber: tenant.vatNumber,
    customerName: booking.user.fullName,
    customerVatOrFiscalCode: booking.user.vatNumber ?? booking.user.idCardNumber,
    taxableAmount,
    vatAmount,
    totalAmount,
    issueDate: new Date(),
  });
  const xmlUrl = await saveFile({ buffer: Buffer.from(xml, "utf-8"), originalName: `${invoiceNumber}.xml`, folder: "documents" });

  const sdiResult = await submitToSdi(xml);

  const invoice = await prisma.invoice.create({
    data: {
      tenantId,
      bookingId,
      number: invoiceNumber,
      taxableAmount,
      vatAmount,
      totalAmount,
      xmlUrl,
      sdiReceiptUrl: sdiResult.ok ? sdiResult.sdiReceiptUrl : null,
      status: sdiResult.ok ? "sent" : "error",
      errorMessage: sdiResult.ok ? null : sdiResult.errorMessage,
      sentAt: sdiResult.ok ? new Date() : null,
    },
  });

  await logAudit({
    tenantId,
    actorId: user.id,
    action: "invoice_sent",
    entityType: "invoice",
    entityId: invoice.id,
    metadata: { status: invoice.status },
  });

  revalidatePath("/desk/contratti");
  return { pdfUrl, status: invoice.status, errorMessage: invoice.errorMessage };
}

export async function retryInvoice(invoiceId: string) {
  const { user, tenantId } = await assertTenant();
  assertOperational(user.role);

  const invoice = await prisma.invoice.findFirstOrThrow({ where: { id: invoiceId, tenantId } });
  const sdiResult = await submitToSdi("");

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: sdiResult.ok ? "sent" : "error",
      errorMessage: sdiResult.ok ? null : sdiResult.errorMessage,
      sentAt: sdiResult.ok ? new Date() : invoice.sentAt,
    },
  });

  await logAudit({ tenantId, actorId: user.id, action: "invoice_retry", entityType: "invoice", entityId: invoiceId, metadata: { status: updated.status } });
  revalidatePath("/desk/contratti");
  return { status: updated.status, errorMessage: updated.errorMessage };
}
