import { complianceStatus, COMPLIANCE_DOT_CLASS } from "@/lib/compliance";

export function ComplianceDate({ date }: { date: string | Date | null }) {
  const d = date ? new Date(date) : null;
  const status = complianceStatus(d);

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={`size-2 shrink-0 rounded-full ${COMPLIANCE_DOT_CLASS[status]}`} />
      {d ? d.toLocaleDateString("it-IT") : "-"}
    </span>
  );
}
