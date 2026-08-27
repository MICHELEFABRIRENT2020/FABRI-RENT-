"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ContractSearchPicker, type ContractSearchResult } from "@/components/desk/contract-search-picker";
import { MultiFileUploader } from "@/components/desk/multi-file-uploader";
import { createClaim } from "@/lib/actions/incident-actions";
import { toDatetimeLocalValue } from "@/lib/datetime-input";

export function ClaimForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [contract, setContract] = useState<ContractSearchResult | null>(null);
  const [date, setDate] = useState(toDatetimeLocalValue(new Date()));
  const [location, setLocation] = useState("");
  const [dynamics, setDynamics] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [documentUrls, setDocumentUrls] = useState<string[]>([]);
  const [insuranceCompany, setInsuranceCompany] = useState("");
  const [franchigiaAmount, setFranchigiaAmount] = useState("");
  const [costs, setCosts] = useState("");
  const [responsibleParty, setResponsibleParty] = useState("");
  const [notes, setNotes] = useState("");

  function handleSubmit() {
    startTransition(async () => {
      try {
        await createClaim({
          vehicleId: contract?.vehicleId ?? undefined,
          bookingId: contract?.bookingId,
          customerId: contract?.customerId,
          date,
          location: location || undefined,
          dynamics: dynamics || undefined,
          photoUrls,
          documentUrls,
          insuranceCompany: insuranceCompany || undefined,
          franchigiaAmount: franchigiaAmount ? Number(franchigiaAmount) : undefined,
          costs: costs ? Number(costs) : undefined,
          responsibleParty: responsibleParty || undefined,
          notes: notes || undefined,
        });
        toast.success("Sinistro registrato");
        setContract(null);
        setLocation("");
        setDynamics("");
        setPhotoUrls([]);
        setDocumentUrls([]);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nuovo sinistro</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ContractSearchPicker selected={contract} onSelect={setContract} />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Data e ora</Label>
            <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Luogo</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Dinamica</Label>
          <Textarea value={dynamics} onChange={(e) => setDynamics(e.target.value)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-2">
            <Label>Compagnia assicurativa</Label>
            <Input value={insuranceCompany} onChange={(e) => setInsuranceCompany(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Franchigia (EUR)</Label>
            <Input type="number" value={franchigiaAmount} onChange={(e) => setFranchigiaAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Costi (EUR)</Label>
            <Input type="number" value={costs} onChange={(e) => setCosts(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Responsabile</Label>
            <Input value={responsibleParty} onChange={(e) => setResponsibleParty(e.target.value)} placeholder="es. Controparte, Locatario" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-2 block text-xs">Fotografie</Label>
            <MultiFileUploader urls={photoUrls} onChange={setPhotoUrls} accept="image/*" label="Aggiungi foto" />
          </div>
          <div>
            <Label className="mb-2 block text-xs">Documenti</Label>
            <MultiFileUploader urls={documentUrls} onChange={setDocumentUrls} accept="application/pdf,image/*" label="Aggiungi documento" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Note</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Salvataggio..." : "Registra sinistro"}
        </Button>
      </CardContent>
    </Card>
  );
}
