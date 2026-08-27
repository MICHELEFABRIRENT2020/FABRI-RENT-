import Stripe from "stripe";

/**
 * Stripe integration.
 *
 * - Pagamento standard (franchigia con cauzione): un'unica PaymentIntent con
 *   `capture_method: "manual"` autorizza l'importo del noleggio + la
 *   cauzione. Non appena l'autorizzazione va a buon fine (webhook
 *   `amount_capturable_updated`), la quota noleggio viene catturata subito
 *   (`final_capture: false`), lasciando la sola cauzione "in sospeso" fino
 *   al check-out desk, dove viene rilasciata o incassata in caso di danni.
 * - Pagamento KASKO / Senza Cauzione: addebito diretto immediato
 *   (`capture_method: "automatic"`), disponibile solo con Carta di Credito.
 *
 * In sviluppo, senza una vera STRIPE_SECRET_KEY, le chiamate di rete
 * falliranno ma l'app resta compilabile e navigabile: usare le route API
 * che avvolgono queste funzioni con gestione errori per l'ambiente demo.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2026-08-26.dahlia",
});

export async function createRentalWithDepositIntent(params: {
  rentalAmountEuroCents: number;
  depositAmountEuroCents: number;
  bookingId: string;
  customerEmail: string;
}) {
  return stripe.paymentIntents.create({
    amount: params.rentalAmountEuroCents + params.depositAmountEuroCents,
    currency: "eur",
    capture_method: "manual",
    payment_method_types: ["card"],
    receipt_email: params.customerEmail,
    metadata: {
      bookingId: params.bookingId,
      kind: "combined_rent_deposit",
      rentalAmountEuroCents: String(params.rentalAmountEuroCents),
      depositAmountEuroCents: String(params.depositAmountEuroCents),
    },
  });
}

export async function createKaskoDirectCharge(params: {
  amountEuroCents: number;
  bookingId: string;
  customerEmail: string;
}) {
  return stripe.paymentIntents.create({
    amount: params.amountEuroCents,
    currency: "eur",
    capture_method: "automatic",
    payment_method_types: ["card"],
    receipt_email: params.customerEmail,
    metadata: { bookingId: params.bookingId, kind: "kasko_charge" },
  });
}

export async function createRentalChargeIntent(params: {
  amountEuroCents: number;
  bookingId: string;
  customerEmail: string;
}) {
  return stripe.paymentIntents.create({
    amount: params.amountEuroCents,
    currency: "eur",
    capture_method: "automatic",
    payment_method_types: ["card"],
    receipt_email: params.customerEmail,
    metadata: { bookingId: params.bookingId, kind: "rental_charge" },
  });
}

/** Captures only the rental portion of a combined rent+deposit authorization, leaving the deposit held. */
export async function capturePartial(paymentIntentId: string, amountEuroCents: number) {
  return stripe.paymentIntents.capture(paymentIntentId, {
    amount_to_capture: amountEuroCents,
    final_capture: false,
  });
}

/** Captures the (remaining) deposit hold - used when a damage ticket withholds part/all of the cauzione. */
export async function captureRemaining(paymentIntentId: string, amountEuroCents?: number) {
  return stripe.paymentIntents.capture(paymentIntentId, {
    amount_to_capture: amountEuroCents,
    final_capture: true,
  });
}

/** Releases the remaining deposit hold with no damage found at check-out. */
export async function cancelRemaining(paymentIntentId: string) {
  return stripe.paymentIntents.cancel(paymentIntentId);
}

export function toStripeAmount(euros: number): number {
  return Math.round(euros * 100);
}

export function fromStripeAmount(cents: number): number {
  return Number((cents / 100).toFixed(2));
}
