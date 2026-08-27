/**
 * Email provider abstraction. In development (no EMAIL_PROVIDER_API_KEY),
 * emails are logged to the console instead of actually being sent so the
 * damage-report / contract / check-in flows work end-to-end without a real
 * provider. Swap `sendEmail` for Resend/SendGrid/SES/etc. once credentials
 * are available (see .env.example).
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
}): Promise<void> {
  if (process.env.EMAIL_PROVIDER_API_KEY) {
    // TODO: integrate real email provider (Resend/SendGrid/SES/etc.) here.
  }
  console.info(
    `[email-provider] -> ${params.to} | ${params.subject} | allegati: ${
      params.attachments?.map((a) => a.filename).join(", ") ?? "nessuno"
    }`
  );
}
