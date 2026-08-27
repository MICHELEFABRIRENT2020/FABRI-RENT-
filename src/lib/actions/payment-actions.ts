"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertTenant, WRITE_ROLES } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createSumupCheckout, getSumupCheckout, mapSumupStatus, isSumupConfigured, SumupNotConfiguredError, SumupApiError } from "@/lib/sumup";
import type { PaymentMethod, PaymentType } from "@/generated/prisma/client";

const MANUAL_METHODS: PaymentMethod[] = ["contanti", "pos", "bonifico", "altro"];

async function assertWrite() {
  const { user, tenantId } = await assertTenant();
  if (!WRITE_ROLES.includes(user.role)) throw new Error("Non autorizzato per questa operazione.");
  return { user, tenantId };
}

/** Cash/POS/bank-transfer/other: recorded immediately, no external provider involved. */
export async function recordManualPayment(params: {
  bookingId: string;
  method: PaymentMethod;
  type: PaymentType;
  amount: number;
}) {
  const { user, tenantId } = await assertWrite();
  if (!MANUAL_METHODS.includes(params.method)) throw new Error("Metodo non valido per la registrazione manuale.");
  if (params.amount <= 0) throw new Error("L'importo deve essere maggiore di zero.");

  const booking = await prisma.booking.findFirst({ where: { id: params.bookingId, tenantId } });
  if (!booking) throw new Error("Prenotazione non trovata.");

  const payment = await prisma.payment.create({
    data: {
      tenantId,
      bookingId: params.bookingId,
      type: params.type,
      method: params.method,
      status: "captured",
      amount: params.amount,
      capturedAt: new Date(),
    },
  });

  await logAudit({ tenantId, actorId: user.id, action: "payment_recorded_manual", entityType: "payment", entityId: payment.id, metadata: { method: params.method, amount: params.amount } });
  revalidatePath(`/desk/prenotazioni/${params.bookingId}`);
  revalidatePath("/desk/cassa");
  return payment;
}

export async function isSumupAvailable(): Promise<boolean> {
  return isSumupConfigured();
}

/** Creates a SumUp hosted checkout for the given amount; the Payment row starts `pending` and is updated by the webhook (or `refreshSumupPaymentStatus`) once SumUp confirms the outcome. */
export async function createSumupPayment(params: { bookingId: string; type: PaymentType; amount: number }) {
  const { user, tenantId } = await assertWrite();
  if (params.amount <= 0) throw new Error("L'importo deve essere maggiore di zero.");

  const limit = await rateLimit("sumup-checkout-create", `${tenantId}:${user.id}`, RATE_LIMITS.paymentCreate);
  if (!limit.allowed) throw new Error("Troppe richieste, riprova tra qualche minuto.");

  const booking = await prisma.booking.findFirst({ where: { id: params.bookingId, tenantId }, include: { user: true } });
  if (!booking) throw new Error("Prenotazione non trovata.");

  const idempotencyKey = crypto.randomUUID();
  const payment = await prisma.payment.create({
    data: {
      tenantId,
      bookingId: params.bookingId,
      type: params.type,
      method: "sumup",
      status: "pending",
      amount: params.amount,
      idempotencyKey,
    },
  });

  try {
    const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const checkout = await createSumupCheckout({
      checkoutReference: payment.id,
      amount: params.amount,
      description: `Contratto ${booking.contractNumber ?? booking.id.slice(0, 8)} - ${booking.user.fullName}`,
      returnUrl: `${appUrl}/api/sumup/webhook`,
      redirectUrl: `${appUrl}/desk/prenotazioni/${params.bookingId}`,
    });

    await prisma.payment.update({ where: { id: payment.id }, data: { sumupCheckoutId: checkout.id } });
    await logAudit({ tenantId, actorId: user.id, action: "sumup_checkout_created", entityType: "payment", entityId: payment.id, metadata: { sumupCheckoutId: checkout.id, amount: params.amount } });
    revalidatePath(`/desk/prenotazioni/${params.bookingId}`);
    return { paymentId: payment.id, hostedCheckoutUrl: checkout.hosted_checkout_url ?? null };
  } catch (error) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "failed", failureReason: error instanceof Error ? error.message : "Errore SumUp" } });
    if (error instanceof SumupNotConfiguredError) throw new Error(error.message);
    if (error instanceof SumupApiError) throw new Error(`Errore SumUp: ${error.message}`);
    throw new Error("Errore imprevisto durante la creazione del checkout SumUp.");
  }
}

/** Manual "check status" for when the deployment has no public HTTPS return_url reachable by SumUp's servers - re-fetches from SumUp directly rather than trusting any client input. */
export async function refreshSumupPaymentStatus(paymentId: string) {
  const { user, tenantId } = await assertWrite();
  const payment = await prisma.payment.findFirst({ where: { id: paymentId, tenantId } });
  if (!payment?.sumupCheckoutId) throw new Error("Pagamento SumUp non trovato.");

  const checkout = await getSumupCheckout(payment.sumupCheckoutId);
  const status = mapSumupStatus(checkout.status);

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status, capturedAt: status === "captured" ? new Date() : payment.capturedAt, sumupTransactionId: checkout.transactions[0]?.id },
  });
  await logAudit({ tenantId, actorId: user.id, action: "sumup_status_refreshed", entityType: "payment", entityId: payment.id, metadata: { status } });
  revalidatePath(`/desk/prenotazioni/${payment.bookingId}`);
  return { status };
}
