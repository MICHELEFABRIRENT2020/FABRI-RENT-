"use client";

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
import { updateDamageRecord } from "@/lib/actions/incident-actions";
import { formatItalianDate } from "@/lib/rental-time";
import type { DamageRecordStatus } from "@/generated/prisma/client";

const STATUS_LABEL: Record<DamageRecordStatus, string> = {
  aperto: "Aperto",
  in_valutazione: "In valutazione",
  addebitato: "Addebitato",
  chiuso: "Chiuso",
};

export type DamageRecordDto = {
  id: string;
  date: string;
  type: string;
  position: string | null;
  vehicleName: string | null;
  customerName: string | null;
  costEstimated: string | null;
  status: DamageRecordStatus;
  photoCount: number;
};

export function DamageRecordList({ records }: { records: DamageRecordDto[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Veicolo</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Posizione</TableHead>
          <TableHead>Costo stimato</TableHead>
          <TableHead>Foto</TableHead>
          <TableHead>Stato</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="whitespace-nowrap">{formatItalianDate(new Date(r.date))}</TableCell>
            <TableCell>{r.customerName ?? "-"}</TableCell>
            <TableCell>{r.vehicleName ?? "-"}</TableCell>
            <TableCell>{r.type}</TableCell>
            <TableCell>{r.position ?? "-"}</TableCell>
            <TableCell>{r.costEstimated ? `EUR ${Number(r.costEstimated).toFixed(2)}` : "-"}</TableCell>
            <TableCell>{r.photoCount}</TableCell>
            <TableCell>
              <Select
                value={r.status}
                disabled={isPending}
                onValueChange={(status) =>
                  startTransition(async () => {
                    await updateDamageRecord(r.id, status as DamageRecordStatus);
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
          </TableRow>
        ))}
        {records.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground">
              Nessun danno registrato.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
