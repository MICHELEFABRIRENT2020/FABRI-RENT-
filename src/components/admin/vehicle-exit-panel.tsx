"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { retireVehicle } from "@/lib/actions/admin-actions";
import type { VehicleExitReason } from "@/generated/prisma/client";

const REASON_LABEL: Record<VehicleExitReason, string> = {
  venduta: "Venduta",
  rottamata: "Rottamata",
  esportata: "Esportata",
  incidente: "Incidente",
  altro: "Altro",
};

export function VehicleExitPanel({
  vehicleId,
  exitDate,
  exitReason,
}: {
  vehicleId: string;
  exitDate: string | null;
  exitReason: VehicleExitReason | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState<VehicleExitReason>("venduta");

  if (exitDate) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Veicolo uscito dalla flotta</AlertTitle>
        <AlertDescription>
          Motivo: {exitReason ? REASON_LABEL[exitReason] : "-"} - Data: {new Date(exitDate).toLocaleDateString("it-IT")}. Il
          veicolo non e&apos; piu&apos; prenotabile.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Uscita dalla flotta</CardTitle>
      </CardHeader>
      <CardContent className="flex items-end gap-3">
        <div className="w-56 space-y-2">
          <Select value={reason} onValueChange={(v) => setReason(v as VehicleExitReason)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(REASON_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="destructive"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await retireVehicle(vehicleId, reason);
              toast.success("Veicolo rimosso dalla flotta attiva");
              router.refresh();
            })
          }
        >
          Segna uscita dalla flotta
        </Button>
      </CardContent>
    </Card>
  );
}
