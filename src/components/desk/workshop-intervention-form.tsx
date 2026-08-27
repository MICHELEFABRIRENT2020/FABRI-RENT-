"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createWorkshopIntervention } from "@/lib/actions/workshop-actions";
import type { WorkshopCategory } from "@/generated/prisma/client";

const CATEGORY_LABEL: Record<WorkshopCategory, string> = {
  meccanica: "Meccanica",
  carrozzeria: "Carrozzeria",
  gommista: "Gommista",
  elettrauto: "Elettrauto",
};

export type CatalogItemDto = { id: string; category: WorkshopCategory; label: string };
export type VehicleOptionDto = { id: string; name: string; plate: string | null };

export function WorkshopInterventionForm({
  catalog,
  vehicles,
}: {
  catalog: CatalogItemDto[];
  vehicles: VehicleOptionDto[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState<WorkshopCategory>("meccanica");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<CatalogItemDto | null>(null);
  const [customLabel, setCustomLabel] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [price, setPrice] = useState("");
  const [parts, setParts] = useState("");
  const [supplier, setSupplier] = useState("");
  const [km, setKm] = useState("");
  const [notes, setNotes] = useState("");
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const filtered = useMemo(
    () =>
      catalog.filter(
        (item) => item.category === category && item.label.toLowerCase().includes(search.toLowerCase())
      ),
    [catalog, category, search]
  );

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
    const label = selectedItem?.label ?? customLabel;
    if (!vehicleId || !label.trim()) {
      toast.error("Seleziona un veicolo e un intervento.");
      return;
    }
    startTransition(async () => {
      try {
        await createWorkshopIntervention({
          vehicleId,
          category,
          catalogItemId: selectedItem?.id,
          label,
          price: price ? Number(price) : undefined,
          parts: parts || undefined,
          supplier: supplier || undefined,
          km: km ? Number(km) : undefined,
          notes: notes || undefined,
          documentUrl: documentUrl ?? undefined,
        });
        toast.success("Intervento registrato");
        setSelectedItem(null);
        setCustomLabel("");
        setPrice("");
        setParts("");
        setSupplier("");
        setKm("");
        setNotes("");
        setDocumentUrl(null);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nuovo intervento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Veicolo</Label>
          <Select value={vehicleId} onValueChange={setVehicleId}>
            <SelectTrigger className="w-full sm:w-96">
              <SelectValue placeholder="Seleziona veicolo" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name} {v.plate ? `- ${v.plate}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={category} onValueChange={(v) => { setCategory(v as WorkshopCategory); setSelectedItem(null); }}>
          <TabsList>
            {(Object.keys(CATEGORY_LABEL) as WorkshopCategory[]).map((c) => (
              <TabsTrigger key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="space-y-2">
          <Label>Cerca intervento</Label>
          <Input placeholder="es. freni, olio, paraurti..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItem(item)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  selectedItem?.id === item.id ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {!selectedItem && (
            <Input placeholder="Oppure descrivi un intervento personalizzato" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} />
          )}
          {selectedItem && <p className="text-xs text-muted-foreground">Selezionato: {selectedItem.label}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-2">
            <Label className="text-xs">Prezzo (EUR)</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Ricambi</Label>
            <Input value={parts} onChange={(e) => setParts(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Fornitore</Label>
            <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Km attuali</Label>
            <Input type="number" value={km} onChange={(e) => setKm(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Note</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Documento / Fattura</Label>
          <Input
            type="file"
            accept="image/*,application/pdf"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
          {documentUrl && <p className="text-xs text-emerald-500">Documento caricato.</p>}
        </div>

        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Salvataggio..." : "Registra intervento"}
        </Button>
      </CardContent>
    </Card>
  );
}
