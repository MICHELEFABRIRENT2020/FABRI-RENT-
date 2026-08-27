import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, capturePartial } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    if (!signature || !webhookSecret) throw new Error("Missing Stripe signature or webhook secret");
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    logger.error({ err }, "[stripe:webhook] signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.amount_capturable_updated": {
      const intent = event.data.object as Stripe.PaymentIntent;
      await handleCombinedAuthorization(intent);
      break;
    }
    case "payment_intent.succeeded": {
      const intent = event.data.object as Stripe.PaymentIntent;
      await updatePaymentStatus(intent.id, "captured");
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      await updatePaymentStatus(intent.id, "failed");
      break;
    }
    case "payment_intent.canceled": {
      const intent = event.data.object as Stripe.PaymentIntent;
      await updatePaymentStatus(intent.id, "canceled");
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

/**
 * A combined rent+deposit authorization just succeeded: capture the rental
 * portion immediately (final_capture: false), leaving the deposit portion
 * held/authorized until the desk operator releases or captures it at
 * check-out.
 */
async function handleCombinedAuthorization(intent: Stripe.PaymentIntent) {
  if (intent.metadata?.kind !== "combined_rent_deposit") return;

  const rentalAmount = Number(intent.metadata.rentalAmountEuroCents ?? 0);
  if (rentalAmount <= 0) return;

  const rentalPayment = await prisma.payment.findFirst({
    where: { stripePaymentIntentId: intent.id, type: "rental_charge" },
  });
  if (rentalPayment?.status === "captured") return; // already handled

  await capturePartial(intent.id, rentalAmount);

  await prisma.payment.updateMany({
    where: { stripePaymentIntentId: intent.id, type: "rental_charge" },
    data: { status: "captured", capturedAt: new Date() },
  });
  await prisma.payment.updateMany({
    where: { stripePaymentIntentId: intent.id, type: "deposit_authorization" },
    data: { status: "authorized" },
  });

  const bookingId = intent.metadata.bookingId;
  if (bookingId) {
    await prisma.booking.update({ where: { id: bookingId }, data: { paymentStatus: "paid" } });
  }
}

async function updatePaymentStatus(
  stripePaymentIntentId: string,
  status: "captured" | "failed" | "canceled"
) {
  const payments = await prisma.payment.findMany({ where: { stripePaymentIntentId } });
  if (payments.length === 0) return;

  // Combined intents are already handled by handleCombinedAuthorization; a
  // top-level `succeeded` on those refers to the final (deposit) capture at
  // check-out, driven by the desk operator flow, not this generic path.
  const isCombined = payments.some((p) => p.type === "deposit_authorization") && payments.some((p) => p.type === "rental_charge");
  if (isCombined && status === "captured") return;

  await prisma.payment.updateMany({
    where: { stripePaymentIntentId },
    data: {
      status,
      capturedAt: status === "captured" ? new Date() : undefined,
      canceledAt: status === "canceled" ? new Date() : undefined,
    },
  });

  const bookingId = payments[0].bookingId;
  if (status === "captured") {
    await prisma.booking.update({ where: { id: bookingId }, data: { paymentStatus: "paid" } });
  }
  if (status === "failed") {
    await prisma.booking.update({ where: { id: bookingId }, data: { paymentStatus: "failed" } });
  }
}
