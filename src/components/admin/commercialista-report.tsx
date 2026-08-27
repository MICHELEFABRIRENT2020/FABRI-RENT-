"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generateFinancialNarrative } from "@/lib/actions/commercialista-actions";
import type { FinancialReport } from "@/lib/commercialista";

const METHOD_LABEL: Record<string, string> = {
  contanti: "Contanti",
  pos: "POS",
  stripe: "Stripe",
  sumup: "SumUp",
  bonifico: "Bonifico",
  altro: "Altro",
};

const CATEGORY_LABEL: Record<string, string> = {
  carburante: "Carburante",
  operaio: "Manodopera",
  ricambi: "Ricambi",
  buoni_pasto: "Buoni pasto",
  fornitori: "Fornitori",
  altro: "Altro",
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: "border-red-500/30 bg-red-500/15 text-red-500",
  warning: "border-amber-500/30 bg-amber-500/15 text-amber-500",
};

export function CommercialistaReport({
  initialReport,
  initialFrom,
  initialTo,
}: {
  initialReport: FinancialReport;
  initialFrom: string;
  initialTo: string;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const report = initialReport;

  function applyFilter() {
    router.push(`/admin/commercialista?from=${from}&to=${to}`);
  }

  function handleGenerateNarrative() {
    startTransition(async () => {
      const result = await generateFinancialNarrative(report);
      if (result.ok) {
        setNarrative(result.narrative);
      } else {
        toast.info(result.reason);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Periodo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label>Da</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>A</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button variant="outline" onClick={applyFilter}>
            Applica
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Entrate</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-emerald-500">EUR {report.entrate.total.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Uscite</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-red-500">EUR {report.uscite.total.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Saldo netto</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">EUR {report.saldoNetto.toFixed(2)}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entrate per metodo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {report.entrate.byMethod.length === 0 && <p className="text-muted-foreground">Nessuna entrata nel periodo.</p>}
            {report.entrate.byMethod.map((m) => (
              <div key={m.method} className="flex items-center justify-between">
                <span>
                  {METHOD_LABEL[m.method] ?? m.method} ({m.count})
                </span>
                <span className="font-medium">EUR {m.total.toFixed(2)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Uscite per categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {report.uscite.byCategory.length === 0 && <p className="text-muted-foreground">Nessuna uscita nel periodo.</p>}
            {report.uscite.byCategory.map((c) => (
              <div key={c.category} className="flex items-center justify-between">
                <span>
                  {CATEGORY_LABEL[c.category] ?? c.category} ({c.count})
                </span>
                <span className="font-medium">EUR {c.total.toFixed(2)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">IVA (da fatture emesse/accettate)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-4">
          <p>
            <span className="text-muted-foreground">Imponibile: </span>EUR {report.iva.imponibile.toFixed(2)}
          </p>
          <p>
            <span className="text-muted-foreground">Imposta: </span>EUR {report.iva.imposta.toFixed(2)}
          </p>
          <p>
            <span className="text-muted-foreground">Totale: </span>EUR {report.iva.totale.toFixed(2)}
          </p>
          <p>
            <span className="text-muted-foreground">Fatture: </span>
            {report.iva.fattureCount}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Anomalie ({report.anomalie.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {report.anomalie.length === 0 && <p className="text-sm text-muted-foreground">Nessuna anomalia rilevata nel periodo.</p>}
          {report.anomalie.map((a, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <Badge variant="outline" className={SEVERITY_COLOR[a.severity]}>
                {a.severity}
              </Badge>
              <span>{a.message}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4" /> Sintesi AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Spiega in linguaggio semplice i numeri sopra (gia&apos; calcolati da questo sistema, non dall&apos;AI).
            Non sostituisce un commercialista abilitato.
          </p>
          {narrative && <p className="whitespace-pre-wrap rounded-md border border-border bg-muted/20 p-3 text-sm">{narrative}</p>}
          <Button variant="outline" size="sm" onClick={handleGenerateNarrative} disabled={isPending}>
            {isPending ? "Generazione..." : "Genera sintesi"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
