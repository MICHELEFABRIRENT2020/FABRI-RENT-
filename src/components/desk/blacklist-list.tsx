"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateBlacklistStatus } from "@/lib/actions/blacklist-actions";
import { formatItalianDate } from "@/lib/rental-time";
import type { BlacklistStatus } from "@/generated/prisma/client";

const STATUS_LABEL: Record<BlacklistStatus, string> = {
  attiva: "Attiva",
  in_verifica: "In verifica",
  archiviata: "Archiviata",
};

export type BlacklistEntryDto = {
  id: string;
  date: string;
  fullNameSnapshot: string;
  reason: string;
  details: string;
  plate: string | null;
  amountDue: string | null;
  status: BlacklistStatus;
};

export function BlacklistList({ entries }: { entries: BlacklistEntryDto[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  const filtered = entries.filter((e) =>
    `${e.fullNameSnapshot} ${e.reason} ${e.details} ${e.plate ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <Input placeholder="Cerca per causale, nome, targa..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Targa</TableHead>
            <TableHead>Causale</TableHead>
            <TableHead>Dettagli</TableHead>
            <TableHead>Importo</TableHead>
            <TableHead>Stato</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="whitespace-nowrap">{formatItalianDate(new Date(e.date))}</TableCell>
              <TableCell className="whitespace-nowrap">{e.fullNameSnapshot}</TableCell>
              <TableCell className="font-mono text-xs">{e.plate ?? "-"}</TableCell>
              <TableCell className="whitespace-nowrap">{e.reason}</TableCell>
              <TableCell className="max-w-xs truncate">{e.details}</TableCell>
              <TableCell>{e.amountDue ? `EUR ${Number(e.amountDue).toFixed(2)}` : "-"}</TableCell>
              <TableCell>
                <Select
                  value={e.status}
                  disabled={isPending}
                  onValueChange={(status) =>
                    startTransition(async () => {
                      await updateBlacklistStatus(e.id, status as BlacklistStatus);
                      router.refresh();
                    })
                  }
                >
                  <SelectTrigger className="w-36">
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
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Nessuna segnalazione.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
