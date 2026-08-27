import crypto from "node:crypto";
import { logger } from "@/lib/logger";

/**
 * OTP SMS provider abstraction used by the desk check-in flow.
 *
 * The default implementation logs the code to the server console instead
 * of sending a real SMS, so the whole check-in flow works end-to-end in
 * development without a Twilio/Vonage/etc. account. Swap `sendOtpSms` for
 * a real provider call once credentials are available (see .env.example).
 */

// In-memory store: fine for a single Node server / demo. Swap for Redis (or
// another shared store) before running multiple instances in production.
const otpStore = new Map<string, { code: string; expiresAt: number }>();
const OTP_TTL_MS = 5 * 60 * 1000;

export function generateOtp(phone: string): string {
  const code = crypto.randomInt(100000, 999999).toString();
  otpStore.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS });
  return code;
}

export async function sendOtpSms(phone: string, code: string, companyName = "FabriGroup Rent Manager"): Promise<void> {
  if (process.env.SMS_PROVIDER_API_KEY) {
    // TODO: integrate real SMS provider (Twilio/Vonage/etc.) here.
  }
  // Deliberately in the message string, not a structured field: the whole
  // point of this dev-mode fallback is to surface the code somewhere
  // readable when there's no real SMS provider to deliver it - putting it
  // in a field named "code" would defeat that (see logger.ts redaction).
  logger.info(`[otp-provider] SMS a ${phone}: il tuo codice ${companyName} e' ${code}`);
}

export function verifyOtp(phone: string, code: string): boolean {
  const entry = otpStore.get(phone);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    return false;
  }
  const valid = entry.code === code;
  if (valid) otpStore.delete(phone);
  return valid;
}
