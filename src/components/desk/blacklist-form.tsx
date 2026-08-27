"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ContractSearchPicker, type ContractSearchResult } from "@/components/desk/contract-search-picker";
import { MultiFileUploader } from "@/components/desk/multi-file-uploader";
import { createBlacklistEntry } from "@/lib/actions/blacklist-actions";
import type { BlacklistReason } from "@/generated/prisma/client";

const REASON_LABEL: Record<BlacklistReason, string> = {
  danno: "Danno",
  mancato_pagamento: "Mancato pagamento",
  frode: "Frode",
  comportamento_scorretto: "Comportamento scorretto",
  incidente: "Incidente",
  documento_falso: "Documento falso",
  altro: "Altro",
};

export function BlacklistForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [contract, setContract] = useState<ContractSearchResult | null>(null);
  const [fullName, setFullName] = useState("");
  const [fiscalCode, setFiscalCode] = useState("");
  const [reason, setReason] = useState<BlacklistReason>("mancato_pagamento");
  const [details, setDetails] = useState("");
  const [amountDue, setAmountDue] = useState("");
  const [documentUrls, setDocumentUrls] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  function handleSubmit() {
    const name = contract?.customerName ?? fullName;
    if (!name.trim() || !details.trim()) {
      toast.error("Indica cliente e causale.");
      return;
    }
    startTransition(async () => {
      try {
        await createBlacklistEntry({
          customerId: contract?.customerId,
          fullNameSnapshot: name,
          fiscalCode: fiscalCode || undefined,
          contractId: contract?.bookingId,
          plate: contract?.plate ?? undefined,
          reason,
          details,
          amountDue: amountDue ? Number(amountDue) : undefined,
          documentUrls,
          photoUrls,
        });
        toast.success("Segnalazione registrata");
        setContract(null);
        setFullName("");
        setDetails("");
        setAmountDue("");
        setDocumentUrls([]);
        setPhotoUrls([]);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nuova segnalazione</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Trattamento dati conforme al GDPR: la segnalazione e&apos; visibile solo al personale autorizzato,
          ogni accesso e modifica e&apos; registrato nell&apos;audit log, e la finalita&apos; e&apos; la
          prevenzione di danni/insoluti - non un automatismo di esclusione.
        </p>
        <ContractSearchPicker selected={contract} onSelect={setContract} label="Cerca cliente / contratto / targa (opzionale)" />
        {!contract && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome cliente</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Codice Fiscale</Label>
              <Input value={fiscalCode} onChange={(e) => setFiscalCode(e.target.value)} />
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Causale</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as BlacklistReason)}>
              <SelectTrigger className="w-full">
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
          <div className="space-y-2">
            <Label>Importo dovuto (EUR)</Label>
            <Input type="number" value={amountDue} onChange={(e) => setAmountDue(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Dettagli</Label>
          <Textarea value={details} onChange={(e) => setDetails(e.target.value)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-2 block text-xs">Documenti</Label>
            <MultiFileUploader urls={documentUrls} onChange={setDocumentUrls} accept="application/pdf,image/*" label="Aggiungi documento" />
          </div>
          <div>
            <Label className="mb-2 block text-xs">Fotografie</Label>
            <MultiFileUploader urls={photoUrls} onChange={setPhotoUrls} accept="image/*" label="Aggiungi foto" />
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Salvataggio..." : "Registra segnalazione"}
        </Button>
      </CardContent>
    </Card>
  );
}
