"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateParkingBaseRate } from "@/lib/actions/admin-actions";
import type { ParkingCategory } from "@/generated/prisma/client";

const LABEL: Record<ParkingCategory, string> = { moto: "Moto", auto: "Auto", furgone: "Furgone" };

export function ParkingBaseRateForm({
  rates,
}: {
  rates: { category: ParkingCategory; dailyRate: string; copertoUplift: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tariffe base Parcheggio (Parking Go)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(["moto", "auto", "furgone"] as ParkingCategory[]).map((category) => {
          const rate = rates.find((r) => r.category === category);
          return <RateRow key={category} category={category} dailyRate={rate?.dailyRate} copertoUplift={rate?.copertoUplift} />;
        })}
      </CardContent>
    </Card>
  );
}

function RateRow({
  category,
  dailyRate,
  copertoUplift,
}: {
  category: ParkingCategory;
  dailyRate?: string;
  copertoUplift?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rate, setRate] = useState(dailyRate ?? "");
  const [uplift, setUplift] = useState(copertoUplift ?? "0.40");

  function handleSave() {
    startTransition(async () => {
      try {
        await updateParkingBaseRate(category, Number(rate), Number(uplift));
        toast.success(`Tariffa ${LABEL[category]} aggiornata`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  return (
    <div className="grid items-end gap-4 sm:grid-cols-4">
      <div className="font-medium">{LABEL[category]}</div>
      <div className="space-y-2">
        <Label>Tariffa base (scoperto, EUR/giorno)</Label>
        <Input type="number" step="0.5" value={rate} onChange={(e) => setRate(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Maggiorazione coperto (0.40 = +40%)</Label>
        <Input type="number" step="0.05" value={uplift} onChange={(e) => setUplift(e.target.value)} />
      </div>
      <Button variant="outline" disabled={isPending} onClick={handleSave}>
        Salva
      </Button>
    </div>
  );
}
