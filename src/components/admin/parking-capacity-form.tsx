"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateParkingCapacity } from "@/lib/actions/admin-actions";
import type { ParkingSlotType } from "@/generated/prisma/client";

const LABEL: Record<ParkingSlotType, string> = { coperto: "Posti Coperti", scoperto: "Posti Scoperti" };

export function ParkingCapacityForm({
  capacities,
}: {
  capacities: { slotType: ParkingSlotType; maxSlots: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Capienza massima (blocca nuove prenotazioni oltre il limite)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(["coperto", "scoperto"] as ParkingSlotType[]).map((slotType) => (
          <Row key={slotType} slotType={slotType} maxSlots={capacities.find((c) => c.slotType === slotType)?.maxSlots} />
        ))}
      </CardContent>
    </Card>
  );
}

function Row({ slotType, maxSlots }: { slotType: ParkingSlotType; maxSlots?: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(String(maxSlots ?? 0));

  return (
    <div className="flex items-end gap-4">
      <div className="w-40 font-medium">{LABEL[slotType]}</div>
      <div className="space-y-2">
        <Label>Numero massimo posti</Label>
        <Input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} className="w-32" />
      </div>
      <Button
        variant="outline"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await updateParkingCapacity(slotType, Number(value));
            toast.success("Capienza aggiornata");
            router.refresh();
          })
        }
      >
        Salva
      </Button>
    </div>
  );
}
