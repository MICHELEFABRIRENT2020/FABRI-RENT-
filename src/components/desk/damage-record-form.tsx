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
import { createDamageRecord } from "@/lib/actions/incident-actions";
import type { DamageRecordType } from "@/generated/prisma/client";

const TYPE_LABEL: Record<DamageRecordType, string> = {
  graffio: "Graffio",
  ammaccatura: "Ammaccatura",
  paraurti: "Paraurti",
  vetro: "Vetro",
  pneumatico: "Pneumatico",
  interni: "Interni",
  carrozzeria: "Carrozzeria",
  meccanica: "Meccanica",
  altro: "Altro",
};

export function DamageRecordForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [contract, setContract] = useState<ContractSearchResult | null>(null);
  const [type, setType] = useState<DamageRecordType>("graffio");
  const [position, setPosition] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [documentUrls, setDocumentUrls] = useState<string[]>([]);
  const [costEstimated, setCostEstimated] = useState("");
  const [franchigiaAmount, setFranchigiaAmount] = useState("");
  const [notes, setNotes] = useState("");

  function handleSubmit() {
    startTransition(async () => {
      try {
        await createDamageRecord({
          vehicleId: contract?.vehicleId ?? undefined,
          bookingId: contract?.bookingId,
          customerId: contract?.customerId,
          type,
          position: position || undefined,
          photoUrls,
          videoUrls,
          documentUrls,
          costEstimated: costEstimated ? Number(costEstimated) : undefined,
          franchigiaAmount: franchigiaAmount ? Number(franchigiaAmount) : undefined,
          notes: notes || undefined,
        });
        toast.success("Danno registrato");
        setContract(null);
        setPhotoUrls([]);
        setVideoUrls([]);
        setDocumentUrls([]);
        setNotes("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nuovo danno</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ContractSearchPicker selected={contract} onSelect={setContract} />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Tipo danno</Label>
            <Select value={type} onValueChange={(v) => setType(v as DamageRecordType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Posizione</Label>
            <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="es. Paraurti anteriore sx" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Costo stimato (EUR)</Label>
            <Input type="number" value={costEstimated} onChange={(e) => setCostEstimated(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Franchigia (EUR)</Label>
            <Input type="number" value={franchigiaAmount} onChange={(e) => setFranchigiaAmount(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label className="mb-2 block text-xs">Foto</Label>
            <MultiFileUploader urls={photoUrls} onChange={setPhotoUrls} accept="image/*" label="Aggiungi foto" />
          </div>
          <div>
            <Label className="mb-2 block text-xs">Video</Label>
            <MultiFileUploader urls={videoUrls} onChange={setVideoUrls} accept="video/*" label="Aggiungi video" />
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
          {isPending ? "Salvataggio..." : "Registra danno"}
        </Button>
      </CardContent>
    </Card>
  );
}
