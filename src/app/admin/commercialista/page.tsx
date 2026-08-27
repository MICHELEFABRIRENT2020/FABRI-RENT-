import { requireRole, ADMIN_ROLES } from "@/lib/session";
import { computeFinancialReport } from "@/lib/commercialista";
import { requireTenant } from "@/lib/session";
import { CommercialistaReport } from "@/components/admin/commercialista-report";

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function CommercialistaPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireRole(...ADMIN_ROLES, "contabilita");
  const { tenantId } = await requireTenant();
  const { from, to } = await searchParams;

  const fromDate = from ? new Date(from) : startOfMonth();
  const toDate = to ? new Date(to) : new Date();

  const report = await computeFinancialReport(tenantId, fromDate, toDate);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Commercialista Virtuale</h1>
        <p className="text-sm text-muted-foreground">
          Riepilogo entrate, uscite, IVA e anomalie calcolato sui dati registrati in questo gestionale. Non
          sostituisce un commercialista abilitato: non ha visibilita&apos; su conti bancari, buste paga o imposte
          diverse dall&apos;IVA gia&apos; presente nelle fatture emesse.
        </p>
      </div>
      <CommercialistaReport
        initialReport={JSON.parse(JSON.stringify(report))}
        initialFrom={fromDate.toISOString().slice(0, 10)}
        initialTo={toDate.toISOString().slice(0, 10)}
      />
    </div>
  );
}
