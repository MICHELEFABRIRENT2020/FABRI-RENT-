"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { createInsurancePolicy, deleteInsurancePolicy } from "@/lib/actions/admin-actions";
import { ComplianceDate } from "@/components/admin/compliance-date";

export type InsurancePolicyDto = {
  id: string;
  company: string;
  policyNumber: string;
  rcaAmount: string | null;
  kaskoAmount: string | null;
  theftFireAmount: string | null;
  damageAmount: string | null;
  periodStart: string;
  periodEnd: string;
  premium: string | null;
  broker: string | null;
  roadsideAssistance: boolean;
  gpsTracking: boolean;
};

export function InsurancePolicyPanel({ vehicleId, policies }: { vehicleId: string; policies: InsurancePolicyDto[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [company, setCompany] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [rcaAmount, setRcaAmount] = useState("");
  const [kaskoAmount, setKaskoAmount] = useState("");
  const [theftFireAmount, setTheftFireAmount] = useState("");
  const [damageAmount, setDamageAmount] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [premium, setPremium] = useState("");
  const [broker, setBroker] = useState("");
  const [roadsideAssistance, setRoadsideAssistance] = useState(false);
  const [gpsTracking, setGpsTracking] = useState(false);

  function handleAdd() {
    if (!company.trim() || !policyNumber.trim() || !periodStart || !periodEnd) {
      toast.error("Compila compagnia, numero polizza e periodo.");
      return;
    }
    startTransition(async () => {
      try {
        await createInsurancePolicy({
          vehicleId,
          company,
          policyNumber,
          rcaAmount: rcaAmount ? Number(rcaAmount) : undefined,
          kaskoAmount: kaskoAmount ? Number(kaskoAmount) : undefined,
          theftFireAmount: theftFireAmount ? Number(theftFireAmount) : undefined,
          damageAmount: damageAmount ? Number(damageAmount) : undefined,
          periodStart,
          periodEnd,
          premium: premium ? Number(premium) : undefined,
          broker: broker || undefined,
          roadsideAssistance,
          gpsTracking,
        });
        toast.success("Polizza aggiunta");
        setCompany("");
        setPolicyNumber("");
        setPeriodStart("");
        setPeriodEnd("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dati assicurativi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Compagnia</TableHead>
              <TableHead>Polizza</TableHead>
              <TableHead>Periodo</TableHead>
              <TableHead>RCA</TableHead>
              <TableHead>Kasko</TableHead>
              <TableHead>Furto/Incendio</TableHead>
              <TableHead>Broker</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.company}</TableCell>
                <TableCell className="font-mono text-xs">{p.policyNumber}</TableCell>
                <TableCell>
                  <ComplianceDate date={p.periodEnd} />
                </TableCell>
                <TableCell>{p.rcaAmount ? `EUR ${Number(p.rcaAmount).toFixed(2)}` : "-"}</TableCell>
                <TableCell>{p.kaskoAmount ? `EUR ${Number(p.kaskoAmount).toFixed(2)}` : "-"}</TableCell>
                <TableCell>{p.theftFireAmount ? `EUR ${Number(p.theftFireAmount).toFixed(2)}` : "-"}</TableCell>
                <TableCell>{p.broker ?? "-"}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await deleteInsurancePolicy(p.id, vehicleId);
                        router.refresh();
                      })
                    }
                  >
                    Elimina
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {policies.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Nessuna polizza registrata.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="space-y-3 border-t pt-4">
          <h4 className="text-sm font-semibold">Nuova polizza</h4>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">Compagnia</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">N. Polizza</Label>
              <Input value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Broker</Label>
              <Input value={broker} onChange={(e) => setBroker(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Premio (EUR)</Label>
              <Input type="number" value={premium} onChange={(e) => setPremium(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Inizio periodo</Label>
              <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fine periodo</Label>
              <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">RCA (EUR)</Label>
              <Input type="number" value={rcaAmount} onChange={(e) => setRcaAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Kasko (EUR)</Label>
              <Input type="number" value={kaskoAmount} onChange={(e) => setKaskoAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Furto/Incendio (EUR)</Label>
              <Input type="number" value={theftFireAmount} onChange={(e) => setTheftFireAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Danni (EUR)</Label>
              <Input type="number" value={damageAmount} onChange={(e) => setDamageAmount(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={roadsideAssistance} onCheckedChange={(v) => setRoadsideAssistance(v === true)} />
              Assistenza stradale
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={gpsTracking} onCheckedChange={(v) => setGpsTracking(v === true)} />
              GPS/Viasat
            </label>
          </div>
          <Button variant="outline" onClick={handleAdd} disabled={isPending}>
            Aggiungi polizza
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
