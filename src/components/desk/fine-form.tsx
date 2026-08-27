"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { IssuingAuthorityPicker } from "@/components/desk/issuing-authority-picker";
import { createFine } from "@/lib/actions/fine-actions";

type ContractMatch = {
  found: boolean;
  bookingId?: string;
  contractNumber?: number | null;
  customerId?: string;
  customerName?: string;
  vehicleId?: string;
  vehicleName?: string | null;
};

export function FineForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [plate, setPlate] = useState("");
  const [violationDate, setViolationDate] = useState("");
  const [violationTime, setViolationTime] = useState("");
  const [verbaleNumber, setVerbaleNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [authorityName, setAuthorityName] = useState("");
  const [authorityPec, setAuthorityPec] = useState("");
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [match, setMatch] = useState<ContractMatch | null>(null);
  const [searchingContract, setSearchingContract] = useState(false);

  async function lookupContract() {
    if (!plate.trim() || !violationDate) return;
    setSearchingContract(true);
    try {
      const res = await fetch(`/api/desk/lookup-contract-by-plate?plate=${encodeURIComponent(plate)}&date=${violationDate}`);
      const data = await res.json();
      setMatch(data);
    } finally {
      setSearchingContract(false);
    }
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "documents");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const { url } = await res.json();
        setDocumentUrl(url);
      }
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit() {
    if (!plate.trim() || !violationDate || !verbaleNumber.trim() || !amount) {
      toast.error("Compila targa, data, numero verbale e importo.");
      return;
    }
    startTransition(async () => {
      try {
        await createFine({
          plate,
          vehicleId: match?.vehicleId,
          contractId: match?.bookingId,
          customerId: match?.customerId,
          violationDate,
          violationTime: violationTime || undefined,
          verbaleNumber,
          issuingAuthorityName: authorityName || undefined,
          issuingAuthorityPec: authorityPec || undefined,
          amount: Number(amount),
          dueDate: dueDate || undefined,
          documentUrl: documentUrl ?? undefined,
        });
        toast.success("Multa registrata");
        setPlate("");
        setVerbaleNumber("");
        setAmount("");
        setDocumentUrl(null);
        setMatch(null);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nuova multa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-2">
            <Label>Targa</Label>
            <Input value={plate} onChange={(e) => setPlate(e.target.value)} onBlur={lookupContract} />
          </div>
          <div className="space-y-2">
            <Label>Data violazione</Label>
            <Input type="date" value={violationDate} onChange={(e) => setViolationDate(e.target.value)} onBlur={lookupContract} />
          </div>
          <div className="space-y-2">
            <Label>Ora</Label>
            <Input type="time" value={violationTime} onChange={(e) => setViolationTime(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>N. verbale</Label>
            <Input value={verbaleNumber} onChange={(e) => setVerbaleNumber(e.target.value)} />
          </div>
        </div>

        {searchingContract && <p className="text-xs text-muted-foreground">Ricerca contratto in corso...</p>}
        {match && (
          <Alert>
            <AlertDescription>
              {match.found
                ? `Contratto trovato: ${match.customerName} - ${match.vehicleName} (n. ${match.contractNumber ?? match.bookingId})`
                : "Nessun contratto trovato per questa targa alla data indicata."}
            </AlertDescription>
          </Alert>
        )}

        <IssuingAuthorityPicker name={authorityName} pec={authorityPec} onChange={(n, p) => { setAuthorityName(n); setAuthorityPec(p); }} />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Importo (EUR)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Scadenza</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Documento verbale</Label>
            <Input
              type="file"
              accept="image/*,application/pdf"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
              }}
            />
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Salvataggio..." : "Registra multa"}
        </Button>
      </CardContent>
    </Card>
  );
}
