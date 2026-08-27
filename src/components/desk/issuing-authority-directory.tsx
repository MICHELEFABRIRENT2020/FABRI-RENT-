"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { createIssuingAuthority } from "@/lib/actions/fine-actions";
import { formatItalianDate } from "@/lib/rental-time";

export type AuthorityDto = { id: string; name: string; pec: string | null; source: string | null; verifiedAt: string | null };

export function IssuingAuthorityDirectory({ authorities }: { authorities: AuthorityDto[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [pec, setPec] = useState("");
  const [source, setSource] = useState("");

  const filtered = authorities.filter((a) => `${a.name} ${a.pec ?? ""}`.toLowerCase().includes(search.toLowerCase()));

  function handleAdd() {
    if (!name.trim()) {
      toast.error("Indica il nome dell'ente.");
      return;
    }
    startTransition(async () => {
      try {
        await createIssuingAuthority({ name, pec: pec || undefined, source: source || undefined });
        toast.success("Ente salvato in rubrica");
        setName("");
        setPec("");
        setSource("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aggiungi / aggiorna ente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Inserire solo PEC verificate da fonti pubbliche ufficiali (es. IPA, sito istituzionale dell&apos;ente).
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Nome ente</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>PEC</Label>
              <Input value={pec} onChange={(e) => setPec(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fonte</Label>
              <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="es. IPA, sito comune" />
            </div>
          </div>
          <Button onClick={handleAdd} disabled={isPending}>
            Salva PEC
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rubrica Enti ({authorities.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Cerca ente o PEC..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ente</TableHead>
                <TableHead>PEC</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead>Data verifica</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.name}</TableCell>
                  <TableCell className="font-mono text-xs">{a.pec ?? "-"}</TableCell>
                  <TableCell>{a.source ?? "-"}</TableCell>
                  <TableCell>{a.verifiedAt ? formatItalianDate(new Date(a.verifiedAt)) : "-"}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nessun ente in rubrica.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
