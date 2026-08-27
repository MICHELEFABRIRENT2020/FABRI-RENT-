"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { updateVehicleStatus, deleteVehicle } from "@/lib/actions/admin-actions";
import type { VehicleStatus } from "@/generated/prisma/client";

export type VehicleDto = {
  id: string;
  name: string;
  category: string;
  dailyRate: string;
  status: VehicleStatus;
  plate: string | null;
};

const STATUS_LABEL: Record<VehicleStatus, string> = {
  available: "Disponibile",
  rented: "Noleggiata",
  maintenance: "In manutenzione",
  retired: "Ritirata",
};

export function VehicleTable({ vehicles }: { vehicles: VehicleDto[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Veicolo</TableHead>
          <TableHead>Categoria</TableHead>
          <TableHead>Targa</TableHead>
          <TableHead>Tariffa/giorno</TableHead>
          <TableHead>Stato</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {vehicles.map((v) => (
          <TableRow key={v.id}>
            <TableCell>{v.name}</TableCell>
            <TableCell>{v.category}</TableCell>
            <TableCell>{v.plate ?? "-"}</TableCell>
            <TableCell>EUR {Number(v.dailyRate).toFixed(2)}</TableCell>
            <TableCell>
              <Select
                value={v.status}
                disabled={isPending}
                onValueChange={(status) =>
                  startTransition(async () => {
                    await updateVehicleStatus(v.id, status as VehicleStatus);
                    router.refresh();
                  })
                }
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await deleteVehicle(v.id);
                    toast.success("Veicolo rimosso");
                    router.refresh();
                  })
                }
              >
                Rimuovi
              </Button>
            </TableCell>
          </TableRow>
        ))}
        {vehicles.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              Nessun veicolo in flotta.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
