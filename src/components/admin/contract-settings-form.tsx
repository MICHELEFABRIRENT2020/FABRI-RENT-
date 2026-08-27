"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateContractSettings } from "@/lib/actions/admin-actions";

export type ContractSettingsDto = {
  franchigiaRcaAmount: string;
  franchigiaRcaPercent: string;
  franchigiaKaskoAmount: string;
  franchigiaKaskoPercent: string;
  franchigiaFurtoAmount: string;
  franchigiaFurtoPercent: string;
  franchigiaIncendioAmount: string;
  franchigiaIncendioPercent: string;
  franchigiaDanniAmount: string;
  franchigiaDanniPercent: string;
  maintenanceIntervalKm: number;
};

const ROWS: { key: "Rca" | "Kasko" | "Furto" | "Incendio" | "Danni"; label: string }[] = [
  { key: "Rca", label: "RCA" },
  { key: "Kasko", label: "Kasko" },
  { key: "Furto", label: "Furto" },
  { key: "Incendio", label: "Incendio" },
  { key: "Danni", label: "Danni" },
];

export function ContractSettingsForm({ settings }: { settings: ContractSettingsDto }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState(settings);

  function set(key: keyof ContractSettingsDto, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleSubmit() {
    startTransition(async () => {
      try {
        await updateContractSettings({
          franchigiaRcaAmount: Number(values.franchigiaRcaAmount),
          franchigiaRcaPercent: Number(values.franchigiaRcaPercent),
          franchigiaKaskoAmount: Number(values.franchigiaKaskoAmount),
          franchigiaKaskoPercent: Number(values.franchigiaKaskoPercent),
          franchigiaFurtoAmount: Number(values.franchigiaFurtoAmount),
          franchigiaFurtoPercent: Number(values.franchigiaFurtoPercent),
          franchigiaIncendioAmount: Number(values.franchigiaIncendioAmount),
          franchigiaIncendioPercent: Number(values.franchigiaIncendioPercent),
          franchigiaDanniAmount: Number(values.franchigiaDanniAmount),
          franchigiaDanniPercent: Number(values.franchigiaDanniPercent),
          maintenanceIntervalKm: Number(values.maintenanceIntervalKm),
        });
        toast.success("Impostazioni contratto aggiornate");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Franchigie contrattuali (modificabili autonomamente)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Questi valori precompilano il template del contratto legale di noleggio. Verificare sempre con un
          legale prima dell&apos;uso.
        </p>
        <div className="grid gap-3">
          {ROWS.map((row) => (
            <div key={row.key} className="grid items-end gap-3 sm:grid-cols-[100px_1fr_1fr]">
              <div className="font-medium">{row.label}</div>
              <div className="space-y-1">
                <Label className="text-xs">Importo (EUR)</Label>
                <Input
                  type="number"
                  min={0}
                  value={values[`franchigia${row.key}Amount` as keyof ContractSettingsDto] as string}
                  onChange={(e) => set(`franchigia${row.key}Amount` as keyof ContractSettingsDto, e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Percentuale (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={values[`franchigia${row.key}Percent` as keyof ContractSettingsDto] as string}
                  onChange={(e) => set(`franchigia${row.key}Percent` as keyof ContractSettingsDto, e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="max-w-xs space-y-1">
          <Label className="text-xs">Intervallo manutenzione automatica (km)</Label>
          <Input
            type="number"
            min={1000}
            value={values.maintenanceIntervalKm}
            onChange={(e) => set("maintenanceIntervalKm", e.target.value)}
          />
        </div>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Salvataggio..." : "Salva impostazioni"}
        </Button>
      </CardContent>
    </Card>
  );
}
