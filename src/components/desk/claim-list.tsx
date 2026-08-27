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
import { updateClaimStatus } from "@/lib/actions/incident-actions";
import { formatItalianDate } from "@/lib/rental-time";
import type { ClaimStatus } from "@/generated/prisma/client";

const STATUS_LABEL: Record<ClaimStatus, string> = {
  aperto: "Aperto",
  in_istruttoria: "In istruttoria",
  liquidazione: "Liquidazione",
  chiuso: "Chiuso",
  respinto: "Respinto",
};

export type ClaimDto = {
  id: string;
  date: string;
  location: string | null;
  vehicleName: string | null;
  customerName: string | null;
  costs: string | null;
  status: ClaimStatus;
};

export function ClaimList({ claims }: { claims: ClaimDto[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Veicolo</TableHead>
          <TableHead>Luogo</TableHead>
          <TableHead>Costi</TableHead>
          <TableHead>Stato pratica</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {claims.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="whitespace-nowrap">{formatItalianDate(new Date(c.date))}</TableCell>
            <TableCell>{c.customerName ?? "-"}</TableCell>
            <TableCell>{c.vehicleName ?? "-"}</TableCell>
            <TableCell>{c.location ?? "-"}</TableCell>
            <TableCell>{c.costs ? `EUR ${Number(c.costs).toFixed(2)}` : "-"}</TableCell>
            <TableCell>
              <Select
                value={c.status}
                disabled={isPending}
                onValueChange={(status) =>
                  startTransition(async () => {
                    await updateClaimStatus(c.id, status as ClaimStatus);
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
          </TableRow>
        ))}
        {claims.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              Nessun sinistro registrato.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
