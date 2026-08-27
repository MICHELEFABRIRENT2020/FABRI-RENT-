import { logger } from "@/lib/logger";

/**
 * SumUp Checkouts API client (section 5). Verified against the official
 * SumUp developer docs (developer.sumup.com/online-payments,
 * developer.sumup.com/docs/api/create-a-checkout,
 * developer.sumup.com/tools/authorization/oauth,
 * developer.sumup.com/online-payments/webhooks) - endpoints, fields and
 * enum values below are taken from that documentation, not invented.
 *
 * Auth: OAuth2 client_credentials grant against POST /token, scope
 * "payments". Checkout lifecycle: POST /v0.1/checkouts creates a PENDING
 * checkout with a `hosted_checkout_url` the customer completes payment
 * on; GET /v0.1/checkouts/{id} returns the current status (PENDING,
 * FAILED, PAID, EXPIRED) plus a `transactions` array. SumUp's own webhook
 * payload is minimal ({event_type, id}) and their docs explicitly say to
 * never trust it - always re-fetch the checkout from the API before
 * acting on a status change (see src/app/api/sumup/webhook/route.ts).
 */

const API_BASE = "https://api.sumup.com";
const REQUEST_TIMEOUT_MS = 10_000;

export type SumupCheckoutStatus = "PENDING" | "FAILED" | "PAID" | "EXPIRED";

export type SumupTransaction = {
  id: string;
  status: "SUCCESSFUL" | "CANCELLED" | "FAILED" | "PENDING" | "REFUNDED";
  payment_type: string;
  amount: number;
  currency: string;
};

export type SumupCheckout = {
  id: string;
  checkout_reference: string;
  status: SumupCheckoutStatus;
  amount: number;
  currency: string;
  hosted_checkout_url?: string;
  transactions: SumupTransaction[];
};

export class SumupNotConfiguredError extends Error {
  constructor() {
    super("SumUp non configurato: impostare SUMUP_CLIENT_ID, SUMUP_CLIENT_SECRET e SUMUP_MERCHANT_CODE.");
    this.name = "SumupNotConfiguredError";
  }
}

export class SumupApiError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = "SumupApiError";
  }
}

function isConfigured(): boolean {
  return Boolean(process.env.SUMUP_CLIENT_ID && process.env.SUMUP_CLIENT_SECRET && process.env.SUMUP_MERCHANT_CODE);
}

export function isSumupConfigured(): boolean {
  return isConfigured();
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function getAccessToken(): Promise<string> {
  if (!isConfigured()) throw new SumupNotConfiguredError();
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value;

  const response = await fetchWithTimeout(`${API_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.SUMUP_CLIENT_ID!,
      client_secret: process.env.SUMUP_CLIENT_SECRET!,
      scope: "payments",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    logger.error({ status: response.status, body: errorBody.slice(0, 300) }, "[sumup] token request failed");
    throw new SumupApiError(`Autenticazione SumUp fallita (${response.status}).`, response.status);
  }

  const json = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

async function sumupRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const response = await fetchWithTimeout(`${API_BASE}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    logger.error({ status: response.status, path, body: errorBody.slice(0, 500) }, "[sumup] API request failed");
    throw new SumupApiError(`SumUp ha risposto con errore ${response.status}.`, response.status);
  }
  return response.json() as Promise<T>;
}

export async function createSumupCheckout(params: {
  checkoutReference: string;
  amount: number;
  currency?: string;
  description: string;
  returnUrl?: string;
  redirectUrl?: string;
}): Promise<SumupCheckout> {
  return sumupRequest<SumupCheckout>("/v0.1/checkouts", {
    method: "POST",
    body: JSON.stringify({
      checkout_reference: params.checkoutReference,
      amount: params.amount,
      currency: params.currency ?? "EUR",
      merchant_code: process.env.SUMUP_MERCHANT_CODE,
      description: params.description,
      return_url: params.returnUrl,
      redirect_url: params.redirectUrl,
    }),
  });
}

export async function getSumupCheckout(checkoutId: string): Promise<SumupCheckout> {
  return sumupRequest<SumupCheckout>(`/v0.1/checkouts/${encodeURIComponent(checkoutId)}`, { method: "GET" });
}

/** Maps SumUp's checkout status to this app's internal PaymentStatus enum. */
export function mapSumupStatus(status: SumupCheckoutStatus): "pending" | "captured" | "failed" | "canceled" {
  switch (status) {
    case "PAID":
      return "captured";
    case "FAILED":
      return "failed";
    case "EXPIRED":
      return "canceled";
    case "PENDING":
    default:
      return "pending";
  }
}
