"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComplianceDate } from "@/components/admin/compliance-date";
import { updateVehicleStatus } from "@/lib/actions/admin-actions";
import type { VehicleStatus } from "@/generated/prisma/client";

export type VehicleDto = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  category: string;
  fuelType: string | null;
  year: number | null;
  plate: string | null;
  chassisNumber: string | null;
  odometerKm: number | null;
  assignedCustomer: string | null;
  status: VehicleStatus;
  insuranceExpiryDate: string | null;
  bolloExpiryDate: string | null;
  revisioneExpiryDate: string | null;
};

const STATUS_LABEL: Record<VehicleStatus, string> = {
  available: "Disponibile",
  rented: "Noleggiata",
  maintenance: "Manutenzione",
  guasto: "Guasto",
  fuori_flotta: "Fuori flotta",
  non_disponibile: "Non disponibile",
};

export function VehicleTable({ vehicles }: { vehicles: VehicleDto[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="overflow-x-auto">
      <Table className="text-sm">
        <TableHeader>
          <TableRow>
            <TableHead>Marca</TableHead>
            <TableHead>Modello</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Alimentazione</TableHead>
            <TableHead>Anno</TableHead>
            <TableHead>Targa</TableHead>
            <TableHead>Telaio</TableHead>
            <TableHead>Km</TableHead>
            <TableHead>Cliente assegnato</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead>Assicurazione</TableHead>
            <TableHead>Bollo</TableHead>
            <TableHead>Revisione</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.map((v) => (
            <TableRow key={v.id}>
              <TableCell className="whitespace-nowrap">{v.brand ?? "-"}</TableCell>
              <TableCell className="whitespace-nowrap">
                <Link href={`/admin/flotta/${v.id}`} className="font-medium text-primary hover:underline">
                  {v.model ?? v.name}
                </Link>
              </TableCell>
              <TableCell className="whitespace-nowrap">{v.category}</TableCell>
              <TableCell className="whitespace-nowrap">{v.fuelType ?? "-"}</TableCell>
              <TableCell>{v.year ?? "-"}</TableCell>
              <TableCell className="whitespace-nowrap font-mono text-xs">{v.plate ?? "-"}</TableCell>
              <TableCell className="whitespace-nowrap font-mono text-xs">{v.chassisNumber ?? "-"}</TableCell>
              <TableCell className="whitespace-nowrap">{v.odometerKm ? `${v.odometerKm.toLocaleString("it-IT")} km` : "-"}</TableCell>
              <TableCell className="whitespace-nowrap">{v.assignedCustomer ?? "-"}</TableCell>
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
                  <SelectTrigger className="w-40">
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
                <ComplianceDate date={v.insuranceExpiryDate} />
              </TableCell>
              <TableCell>
                <ComplianceDate date={v.bolloExpiryDate} />
              </TableCell>
              <TableCell>
                <ComplianceDate date={v.revisioneExpiryDate} />
              </TableCell>
            </TableRow>
          ))}
          {vehicles.length === 0 && (
            <TableRow>
              <TableCell colSpan={13} className="text-center text-muted-foreground">
                Nessun veicolo in flotta.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
