import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSumupCheckout, mapSumupStatus } from "@/lib/sumup";
import { logAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

/**
 * SumUp "return_url" webhook target (section 5). SumUp's payload is
 * intentionally minimal ({event_type, id}) and their own docs say never
 * to trust it - always re-fetch the checkout from the API with our own
 * credentials before updating anything. Unknown event_types are ignored
 * (SumUp explicitly reserves the right to add new ones without notice).
 */
export async function POST(req: NextRequest) {
  let body: { event_type?: string; id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.event_type !== "CHECKOUT_STATUS_CHANGED" || !body.id) {
    // Always 2xx: SumUp only requires a fast, valid response, and unknown
    // event types must be silently ignored per their forward-compat policy.
    return NextResponse.json({ received: true });
  }

  try {
    const checkout = await getSumupCheckout(body.id);
    const status = mapSumupStatus(checkout.status);

    const payment = await prisma.payment.findFirst({ where: { sumupCheckoutId: checkout.id } });
    if (!payment) {
      logger.warn({ checkoutId: checkout.id }, "[sumup-webhook] no matching Payment row");
      return NextResponse.json({ received: true });
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status, capturedAt: status === "captured" ? new Date() : payment.capturedAt, sumupTransactionId: checkout.transactions[0]?.id },
    });
    await logAudit({ tenantId: payment.tenantId, actorId: null, action: "sumup_webhook_status_update", entityType: "payment", entityId: payment.id, metadata: { status, checkoutId: checkout.id } });
  } catch (error) {
    logger.error({ err: error, checkoutId: body.id }, "[sumup-webhook] failed to process event");
  }

  return NextResponse.json({ received: true });
}
