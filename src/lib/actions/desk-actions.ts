"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertRole } from "@/lib/session";
import { computeOverrunPenaltyDays } from "@/lib/rental-time";
import { verifyOtp, generateOtp, sendOtpSms } from "@/lib/otp-provider";
import { sendEmail } from "@/lib/email-provider";
import { generateDamageReportPdf, generateDamageTicketPdf } from "@/lib/pdf";
import { captureRemaining, cancelRemaining, toStripeAmount } from "@/lib/stripe";
import { resolveExtensionRequest } from "@/lib/fleet-engine";
import type { DocumentAuditStatus, CheckInMethod } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Document audit
// ---------------------------------------------------------------------------

export async function reviewDocument(params: {
  documentAuditId: string;
  status: DocumentAuditStatus;
  reviewNote?: string;
}) {
  const operator = await assertRole("operator", "super_admin");

  await prisma.documentAudit.update({
    where: { id: params.documentAuditId },
    data: {
      status: params.status,
      reviewNote: params.reviewNote,
      reviewedById: operator.id,
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/desk");
}

// ---------------------------------------------------------------------------
// OTP check-in
// ---------------------------------------------------------------------------

export async function requestCheckInOtp(phone: string) {
  await assertRole("operator", "super_admin");
  const code = generateOtp(phone);
  await sendOtpSms(phone, code);
  return { sent: true };
}

// ---------------------------------------------------------------------------
// Check-in
// ---------------------------------------------------------------------------

export async function checkInBooking(params: {
  bookingId: string;
  km: number;
  fuel: string;
  method: CheckInMethod;
  signatureUrl?: string;
  otpPhone?: string;
  otpCode?: string;
  damagePhotoUrls: string[];
  damageNotes?: string;
}) {
  const operator = await assertRole("operator", "super_admin");

  if (params.method === "otp_sms") {
    if (!params.otpPhone || !params.otpCode || !verifyOtp(params.otpPhone, params.otpCode)) {
      throw new Error("Codice OTP non valido o scaduto.");
    }
  } else if (!params.signatureUrl) {
    throw new Error("Firma digitale mancante.");
  }

  const booking = await prisma.booking.update({
    where: { id: params.bookingId },
    data: {
      checkInAt: new Date(),
      checkInKm: params.km,
      checkInFuel: params.fuel,
      checkInMethod: params.method,
      signatureUrl: params.signatureUrl,
      otpVerifiedAt: params.method === "otp_sms" ? new Date() : undefined,
      operatorId: operator.id,
      status: "checked_in",
    },
    include: { vehicle: true, user: true },
  });

  let reportPdfUrl: string | undefined;
  if (params.damagePhotoUrls.length > 0 || params.damageNotes) {
    const pdfBytes = await generateDamageReportPdf({
      bookingId: booking.id,
      vehicleName: booking.vehicle?.name ?? "Parcheggio",
      customerName: booking.user.fullName,
      notes: params.damageNotes ?? null,
      photoCount: params.damagePhotoUrls.length,
      createdAt: new Date(),
    });

    await prisma.damageReport.create({
      data: {
        bookingId: booking.id,
        photoUrls: params.damagePhotoUrls,
        notes: params.damageNotes,
      },
    });

    await sendEmail({
      to: booking.user.email,
      subject: "Fabri GROUP - Report danni preesistenti e contratto di noleggio",
      html: `<p>Gentile ${booking.user.fullName}, in allegato il report fotografico e il contratto di noleggio relativo alla prenotazione ${booking.id}.</p>`,
      attachments: [{ filename: "report-contratto.pdf", content: Buffer.from(pdfBytes), contentType: "application/pdf" }],
    });
  }

  revalidatePath("/desk");
  revalidatePath(`/desk/prenotazioni/${params.bookingId}`);
  return { reportPdfUrl };
}

// ---------------------------------------------------------------------------
// Check-out (penalty engine + damage ticket + deposit capture/release)
// ---------------------------------------------------------------------------

export async function checkOutBooking(params: {
  bookingId: string;
  km: number;
  fuel: string;
  actualReturnAt?: string;
  damageDescription?: string;
  damageWithheldAmount?: number;
}) {
  await assertRole("operator", "super_admin");

  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: params.bookingId },
    include: { vehicle: true, user: true, payments: true },
  });

  const actualReturnAt = params.actualReturnAt ? new Date(params.actualReturnAt) : new Date();
  const penaltyDays = computeOverrunPenaltyDays(booking.endDate, actualReturnAt);
  const dailyRate = booking.vehicle ? Number(booking.vehicle.dailyRate) : Number(booking.basePrice);
  const penaltyAmount = penaltyDays * dailyRate;
  const damageWithheld = Math.max(0, params.damageWithheldAmount ?? 0);
  const totalWithheld = Math.min(penaltyAmount + damageWithheld, Number(booking.depositAmount));

  const depositPayment = booking.payments.find((p) => p.type === "deposit_authorization");

  if (booking.hasDeposit && depositPayment?.stripePaymentIntentId) {
    if (totalWithheld > 0) {
      await captureRemaining(depositPayment.stripePaymentIntentId, toStripeAmount(totalWithheld));
      await prisma.payment.update({
        where: { id: depositPayment.id },
        data: { status: "captured", capturedAt: new Date(), amount: totalWithheld },
      });
    } else {
      await cancelRemaining(depositPayment.stripePaymentIntentId);
      await prisma.payment.update({
        where: { id: depositPayment.id },
        data: { status: "canceled", canceledAt: new Date() },
      });
    }
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      actualReturnAt,
      checkOutKm: params.km,
      checkOutFuel: params.fuel,
      status: "completed",
      penaltyAppliedAt: penaltyDays > 0 ? new Date() : undefined,
      penaltyAmount: penaltyDays > 0 ? penaltyAmount : undefined,
      penaltyReason: penaltyDays > 0 ? `Ritardo restituzione non comunicato: +${penaltyDays} giorno/i` : undefined,
    },
  });

  if (params.damageDescription) {
    const pdfBytes = await generateDamageTicketPdf({
      bookingId: booking.id,
      vehicleName: booking.vehicle?.name ?? "Parcheggio",
      customerName: booking.user.fullName,
      description: params.damageDescription,
      depositWithheldAmount: damageWithheld,
      createdAt: new Date(),
    });

    await prisma.damageTicket.create({
      data: {
        bookingId: booking.id,
        description: params.damageDescription,
        depositWithheldAmount: damageWithheld,
        status: damageWithheld > 0 ? "deposit_withheld" : "open",
      },
    });

    await sendEmail({
      to: booking.user.email,
      subject: "Fabri GROUP - Report danni al check-out",
      html: `<p>Gentile ${booking.user.fullName}, in allegato il report danni riscontrati al rientro del veicolo (prenotazione ${booking.id}).</p>`,
      attachments: [{ filename: "report-danni.pdf", content: Buffer.from(pdfBytes), contentType: "application/pdf" }],
    });
  }

  revalidatePath("/desk");
  revalidatePath(`/desk/prenotazioni/${params.bookingId}`);
  return { penaltyDays, penaltyAmount, totalWithheld };
}

// ---------------------------------------------------------------------------
// Operator manual price override
// ---------------------------------------------------------------------------

export async function overrideBookingPrice(params: { bookingId: string; newTotal: number; reason: string }) {
  const operator = await assertRole("operator", "super_admin");

  await prisma.booking.update({
    where: { id: params.bookingId },
    data: {
      priceOverride: params.newTotal,
      priceOverrideReason: params.reason,
      priceOverrideById: operator.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: operator.id,
      action: "price_override",
      entityType: "booking",
      entityId: params.bookingId,
      metadata: { newTotal: params.newTotal, reason: params.reason },
    },
  });

  revalidatePath(`/desk/prenotazioni/${params.bookingId}`);
}

// ---------------------------------------------------------------------------
// Smart Extension Engine
// ---------------------------------------------------------------------------

export async function createExtensionRequest(params: {
  bookingId: string;
  requestedEndDate: string;
  channel: "whatsapp" | "web";
}) {
  await prisma.extensionRequest.create({
    data: {
      bookingId: params.bookingId,
      requestedEndDate: new Date(params.requestedEndDate),
      channel: params.channel,
    },
  });
  revalidatePath("/desk/prolungamenti");
}

export async function decideExtensionRequest(extensionRequestId: string) {
  const operator = await assertRole("operator", "super_admin");

  const request = await prisma.extensionRequest.findUniqueOrThrow({ where: { id: extensionRequestId } });
  const resolution = await resolveExtensionRequest({
    bookingId: request.bookingId,
    requestedEndDate: request.requestedEndDate,
  });

  if (!resolution.approved) {
    await prisma.extensionRequest.update({
      where: { id: extensionRequestId },
      data: { status: "rejected", decidedById: operator.id, decidedAt: new Date() },
    });
    revalidatePath("/desk/prolungamenti");
    return { approved: false as const };
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: request.bookingId },
      data: { endDate: request.requestedEndDate },
    });

    if (resolution.bumpedBookingId && resolution.reassignedVehicleId) {
      await tx.booking.update({
        where: { id: resolution.bumpedBookingId },
        data: { vehicleId: resolution.reassignedVehicleId },
      });
    }

    await tx.extensionRequest.update({
      where: { id: extensionRequestId },
      data: {
        status: "approved",
        bumpedBookingId: resolution.bumpedBookingId,
        reassignedVehicleId: resolution.reassignedVehicleId,
        decidedById: operator.id,
        decidedAt: new Date(),
      },
    });
  });

  revalidatePath("/desk/prolungamenti");
  return { approved: true as const, bumped: Boolean(resolution.bumpedBookingId) };
}
