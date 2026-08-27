"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateOtp, sendOtpSms, verifyOtp } from "@/lib/otp-provider";
import { logAudit } from "@/lib/audit";

/** Public, token-authenticated actions for the customer-facing signing page (/firma/[token]). */

export async function requestSignatureOtp(token: string) {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { signatureLinkToken: token },
    include: { user: true },
  });
  const code = generateOtp(booking.user.phone);
  await sendOtpSms(booking.user.phone, code);
  await prisma.booking.update({ where: { id: booking.id }, data: { signatureStatus: "otp_pending" } });
  return { maskedPhone: maskPhone(booking.user.phone) };
}

export async function confirmSignature(token: string, otpCode: string) {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { signatureLinkToken: token },
    include: { user: true },
  });

  if (!verifyOtp(booking.user.phone, otpCode)) {
    throw new Error("Codice OTP non valido o scaduto.");
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { signatureStatus: "signed", signatureCompletedAt: new Date() },
  });

  await logAudit({
    tenantId: booking.tenantId,
    actorId: null,
    action: "contract_signed_by_customer",
    entityType: "booking",
    entityId: booking.id,
  });

  revalidatePath("/desk/contratti");
  return { signed: true };
}

function maskPhone(phone: string): string {
  return phone.length > 4 ? `${"*".repeat(phone.length - 4)}${phone.slice(-4)}` : phone;
}
