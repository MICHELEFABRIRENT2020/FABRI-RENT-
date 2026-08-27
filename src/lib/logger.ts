import pino from "pino";

/**
 * Structured logger (section 20). Replaces ad-hoc `console.*` calls in
 * server-side code so logs are machine-parseable in staging/production
 * (JSON lines) while staying readable in development (pino-pretty).
 *
 * Redaction paths cover the fields most likely to leak a secret through a
 * careless `logger.info({ ...payload })` call. Never log raw request
 * bodies, headers, or DB rows without picking the specific safe fields.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  redact: {
    paths: [
      "password",
      "passwordHash",
      "*.password",
      "*.passwordHash",
      "token",
      "*.token",
      "secret",
      "*.secret",
      "apiKey",
      "*.apiKey",
      "authorization",
      "*.authorization",
      "totp",
      "*.totp",
      "twoFactorSecret",
      "*.twoFactorSecret",
      "cardNumber",
      "*.cardNumber",
    ],
    censor: "[redacted]",
  },
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" } },
});

export function childLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
