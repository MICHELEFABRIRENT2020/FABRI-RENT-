"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { resolveInsuranceZone } from "@/lib/insurance-zone";
import { ShieldAlert } from "lucide-react";

const REGIONS = [
  "Abruzzo",
  "Basilicata",
  "Calabria",
  "Campania",
  "Emilia-Romagna",
  "Friuli-Venezia Giulia",
  "Lazio",
  "Liguria",
  "Lombardia",
  "Marche",
  "Molise",
  "Piemonte",
  "Puglia",
  "Sardegna",
  "Sicilia",
  "Toscana",
  "Trentino-Alto Adige",
  "Umbria",
  "Valle d'Aosta",
  "Veneto",
];

export type InsuranceOptionDto = {
  id: string;
  tier: string;
  label: string;
  residualDeductible: string;
  dailyCost: string;
  requiresCreditCard: boolean;
};

export function InsuranceSelector({
  days,
  selectedId,
  paymentMethod,
  onSelect,
}: {
  days: number;
  selectedId: string | null;
  paymentMethod: "credit_card" | "debit_card";
  onSelect: (option: InsuranceOptionDto) => void;
}) {
  const [region, setRegion] = useState("Campania");
  const [options, setOptions] = useState<InsuranceOptionDto[]>([]);
  const [loading, setLoading] = useState(false);

  const zone = resolveInsuranceZone(region);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-dependency-change loading flag
    setLoading(true);
    fetch(`/api/insurance-options?zone=${zone}`)
      .then((r) => r.json())
      .then((data) => setOptions(data.options ?? []))
      .finally(() => setLoading(false));
  }, [zone]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="region">Regione di residenza</Label>
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger id="region" className="w-full sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REGIONS.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {zone === "sud_italia"
            ? "Sud Italia: franchigia a 3 livelli, mai ridotta a 0 euro."
            : "Centro/Nord Italia: disponibile anche l'opzione KASKO Senza Cauzione."}
        </p>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Caricamento opzioni assicurative...</p>}

      {!loading && (
        <RadioGroup
          value={selectedId ?? undefined}
          onValueChange={(id) => {
            const option = options.find((o) => o.id === id);
            if (option) onSelect(option);
          }}
          className="gap-3"
        >
          {options.map((option) => {
            const disabled = option.requiresCreditCard && paymentMethod !== "credit_card";
            return (
              <label
                key={option.id}
                className="radio-card flex items-start gap-3 border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 aria-disabled:opacity-50"
                aria-disabled={disabled}
              >
                <RadioGroupItem value={option.id} disabled={disabled} className="mt-1" />
                <div className="flex-1">
                  <p className="font-medium">{option.label}</p>
                  <p className="text-sm text-muted-foreground">
                    Franchigia residua: EUR {Number(option.residualDeductible).toFixed(2)} - EUR{" "}
                    {Number(option.dailyCost).toFixed(2)}/giorno x {days} giorni = EUR{" "}
                    {(Number(option.dailyCost) * days).toFixed(2)}
                  </p>
                  {option.requiresCreditCard && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                      <ShieldAlert className="size-3.5" /> Richiede pagamento con Carta di Credito
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </RadioGroup>
      )}

      {options.find((o) => o.id === selectedId)?.requiresCreditCard && paymentMethod !== "credit_card" && (
        <Alert>
          <AlertDescription>
            Hai selezionato KASKO Senza Cauzione: al passo successivo scegli &quot;Carta di Credito&quot; come metodo
            di pagamento.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
