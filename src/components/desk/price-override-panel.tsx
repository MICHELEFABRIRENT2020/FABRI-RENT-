"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { overrideBookingPrice } from "@/lib/actions/desk-actions";

export function PriceOverridePanel({
  bookingId,
  currentTotal,
  existingOverride,
}: {
  bookingId: string;
  currentTotal: number;
  existingOverride: { newTotal: number; reason: string } | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newTotal, setNewTotal] = useState(String(existingOverride?.newTotal ?? currentTotal));
  const [reason, setReason] = useState(existingOverride?.reason ?? "");

  function handleSubmit() {
    if (!reason.trim()) {
      toast.error("Indica il motivo della modifica manuale.");
      return;
    }
    startTransition(async () => {
      try {
        await overrideBookingPrice({ bookingId, newTotal: Number(newTotal), reason });
        toast.success("Prezzo aggiornato");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Modifica Manuale / Sconto Operatore</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Totale calcolato: EUR {currentTotal.toFixed(2)}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="newTotal">Nuovo totale (EUR)</Label>
            <Input id="newTotal" type="number" min={0} value={newTotal} onChange={(e) => setNewTotal(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo</Label>
            <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <Button variant="outline" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Salvataggio..." : "Applica modifica"}
        </Button>
      </CardContent>
    </Card>
  );
}
