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
import { updateFineStatus } from "@/lib/actions/fine-actions";
import { formatItalianDate } from "@/lib/rental-time";
import type { FineStatus } from "@/generated/prisma/client";

const STATUS_LABEL: Record<FineStatus, string> = {
  da_notificare: "Da notificare",
  notificata: "Notificata",
  in_ricorso: "In ricorso",
  pagata: "Pagata",
  archiviata: "Archiviata",
};

export type FineDto = {
  id: string;
  plate: string;
  violationDate: string;
  verbaleNumber: string;
  authorityName: string | null;
  amount: string;
  dueDate: string | null;
  hasContract: boolean;
  status: FineStatus;
};

export function FineList({ fines }: { fines: FineDto[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Targa</TableHead>
          <TableHead>Data</TableHead>
          <TableHead>N. Verbale</TableHead>
          <TableHead>Ente</TableHead>
          <TableHead>Importo</TableHead>
          <TableHead>Scadenza</TableHead>
          <TableHead>Stato</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {fines.map((f) => (
          <TableRow key={f.id}>
            <TableCell className="font-mono text-xs">{f.plate}</TableCell>
            <TableCell className="whitespace-nowrap">{formatItalianDate(new Date(f.violationDate))}</TableCell>
            <TableCell>{f.verbaleNumber}</TableCell>
            <TableCell>{f.authorityName ?? "-"}</TableCell>
            <TableCell>EUR {Number(f.amount).toFixed(2)}</TableCell>
            <TableCell className="whitespace-nowrap">{f.dueDate ? formatItalianDate(new Date(f.dueDate)) : "-"}</TableCell>
            <TableCell>
              <Select
                value={f.status}
                disabled={isPending}
                onValueChange={(status) =>
                  startTransition(async () => {
                    await updateFineStatus(f.id, status as FineStatus);
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
              <Button
                size="sm"
                variant="outline"
                disabled={!f.hasContract}
                title={f.hasContract ? "" : "Nessun contratto associato"}
                onClick={() => window.open(`/api/fines/${f.id}/appeal-pdf`, "_blank")}
              >
                Genera Ricorso
              </Button>
            </TableCell>
          </TableRow>
        ))}
        {fines.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground">
              Nessuna multa registrata.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
