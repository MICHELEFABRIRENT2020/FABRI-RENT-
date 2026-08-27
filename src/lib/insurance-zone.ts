import type { InsuranceZone } from "@/generated/prisma/client";

/** Regions considered "Sud Italia" for the geo-localized insurance engine. */
const SOUTH_REGIONS = new Set([
  "Abruzzo",
  "Molise",
  "Campania",
  "Puglia",
  "Basilicata",
  "Calabria",
  "Sicilia",
  "Sardegna",
]);

export function resolveInsuranceZone(region: string): InsuranceZone {
  return SOUTH_REGIONS.has(region) ? "sud_italia" : "centro_nord_italia";
}

/**
 * KASKO "Senza Cauzione" (0 euro franchigia) is only ever offered in
 * Centro/Nord Italia and only usable with a credit card payment - it
 * triggers an immediate direct Stripe charge instead of a deposit
 * pre-authorization. Sud Italia franchigie are never reduced to 0.
 */
export function isKasko(tier: string): boolean {
  return tier === "kasko_senza_cauzione";
}

export function assertInsuranceSelectable(
  option: { zone: InsuranceZone; tier: string; requiresCreditCard: boolean },
  paymentMethod: "credit_card" | "debit_card"
) {
  if (option.requiresCreditCard && paymentMethod !== "credit_card") {
    throw new Error(
      "L'opzione KASKO Senza Cauzione e' disponibile esclusivamente con pagamento tramite Carta di Credito."
    );
  }
}
