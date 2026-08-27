"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { checkOutBooking } from "@/lib/actions/desk-actions";
import { toDatetimeLocalValue, datetimeLocalToISO } from "@/lib/datetime-input";

export function CheckOutPanel({ bookingId, scheduledEndDate }: { bookingId: string; scheduledEndDate: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [km, setKm] = useState("");
  const [fuel, setFuel] = useState("");
  const [actualReturnAt, setActualReturnAt] = useState(toDatetimeLocalValue(new Date()));
  const [damageDescription, setDamageDescription] = useState("");
  const [damageWithheldAmount, setDamageWithheldAmount] = useState("");
  const [result, setResult] = useState<{ penaltyDays: number; penaltyAmount: number; totalWithheld: number } | null>(
    null
  );

  const isLate = new Date(actualReturnAt) > new Date(scheduledEndDate);

  function handleSubmit() {
    if (!km || !fuel) {
      toast.error("Inserisci KM e livello carburante.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await checkOutBooking({
          bookingId,
          km: Number(km),
          fuel,
          actualReturnAt: datetimeLocalToISO(actualReturnAt),
          damageDescription: damageDescription || undefined,
          damageWithheldAmount: damageWithheldAmount ? Number(damageWithheldAmount) : undefined,
        });
        setResult(res);
        toast.success("Check-out completato");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore durante il check-out");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Check-out</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="co-km">Chilometraggio</Label>
            <Input id="co-km" type="number" value={km} onChange={(e) => setKm(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="co-fuel">Livello carburante</Label>
            <Input id="co-fuel" value={fuel} onChange={(e) => setFuel(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="co-return">Rientro effettivo</Label>
            <Input
              id="co-return"
              type="datetime-local"
              value={actualReturnAt}
              onChange={(e) => setActualReturnAt(e.target.value)}
            />
          </div>
        </div>

        {isLate && (
          <Alert variant="destructive">
            <AlertTitle>Ritardo rilevato</AlertTitle>
            <AlertDescription>
              Il rientro e&apos; successivo all&apos;orario previsto: verra&apos; addebitata automaticamente una
              giornata extra (Penalty Engine).
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="damage">Danni riscontrati al check-out (opzionale -&gt; apre Ticket Danno)</Label>
          <Textarea
            id="damage"
            placeholder="Descrizione del danno riscontrato"
            value={damageDescription}
            onChange={(e) => setDamageDescription(e.target.value)}
          />
          {damageDescription && (
            <div className="space-y-2">
              <Label htmlFor="withheld">Importo cauzione da trattenere (EUR)</Label>
              <Input
                id="withheld"
                type="number"
                min={0}
                value={damageWithheldAmount}
                onChange={(e) => setDamageWithheldAmount(e.target.value)}
              />
            </div>
          )}
        </div>

        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Salvataggio..." : "Conferma Check-out"}
        </Button>

        {result && (
          <Alert>
            <AlertTitle>Riepilogo check-out</AlertTitle>
            <AlertDescription>
              {result.penaltyDays > 0 && <p>Penale ritardo: {result.penaltyDays} giorno/i - EUR {result.penaltyAmount.toFixed(2)}</p>}
              <p>Totale trattenuto dalla cauzione: EUR {result.totalWithheld.toFixed(2)}</p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
