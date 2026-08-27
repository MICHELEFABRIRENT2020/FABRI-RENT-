/** Green = regolare, Giallo = prossima scadenza (<=30gg), Rosso = scaduto (section 6). */
export type ComplianceStatus = "ok" | "warning" | "expired" | "unknown";

const WARNING_WINDOW_DAYS = 30;

export function complianceStatus(expiryDate: Date | null | undefined): ComplianceStatus {
  if (!expiryDate) return "unknown";
  const daysLeft = (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysLeft < 0) return "expired";
  if (daysLeft <= WARNING_WINDOW_DAYS) return "warning";
  return "ok";
}

export const COMPLIANCE_DOT_CLASS: Record<ComplianceStatus, string> = {
  ok: "bg-emerald-500",
  warning: "bg-amber-500",
  expired: "bg-red-500",
  unknown: "bg-muted-foreground/40",
};
