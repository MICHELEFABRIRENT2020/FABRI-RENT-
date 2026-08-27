"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { createVehicle } from "@/lib/actions/admin-actions";
import { BrandModelPicker, type BrandModelResult } from "@/components/admin/brand-model-picker";

export function VehicleForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [brandId, setBrandId] = useState<string | undefined>();
  const [vehicleModelId, setVehicleModelId] = useState<string | undefined>();
  const [category, setCategory] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [seats, setSeats] = useState("");
  const [transmission, setTransmission] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [plate, setPlate] = useState("");
  const [chassisNumber, setChassisNumber] = useState("");
  const [year, setYear] = useState("");
  const [lookingUpPlate, setLookingUpPlate] = useState(false);

  function handlePlateLookup() {
    if (!plate.trim()) {
      toast.error("Inserisci prima la targa.");
      return;
    }
    setLookingUpPlate(true);
    fetch(`/api/desk/plate-lookup?plate=${encodeURIComponent(plate)}`)
      .then((r) => r.json())
      .then((res) => {
        if (!res.ok) {
          toast.info(res.reason ?? "Lookup targa non disponibile.");
          return;
        }
        const data = res.data as { brand: string | null; model: string | null; year: number | null; fuelType: string | null; chassisNumber: string | null; category: string | null };
        if (data.brand) setBrand(data.brand);
        if (data.model) setModel(data.model);
        if (data.brand && data.model) setName(`${data.brand} ${data.model}`);
        if (data.year) setYear(String(data.year));
        if (data.fuelType) setFuelType(data.fuelType);
        if (data.chassisNumber) setChassisNumber(data.chassisNumber);
        if (data.category) setCategory(data.category);
        setBrandId(undefined);
        setVehicleModelId(undefined);
        toast.success("Dati veicolo compilati dal lookup targa.");
      })
      .catch(() => toast.error("Errore durante il lookup targa."))
      .finally(() => setLookingUpPlate(false));
  }

  function handleSubmit() {
    if (!name.trim() || !category.trim() || !dailyRate) {
      toast.error("Compila nome, categoria e tariffa giornaliera.");
      return;
    }
    startTransition(async () => {
      try {
        await createVehicle({
          name,
          brand: brand || undefined,
          model: model || undefined,
          brandId,
          vehicleModelId,
          category,
          dailyRate: Number(dailyRate),
          seats: seats ? Number(seats) : undefined,
          transmission: transmission || undefined,
          fuelType: fuelType || undefined,
          plate: plate || undefined,
          chassisNumber: chassisNumber || undefined,
          year: year ? Number(year) : undefined,
        });
        toast.success("Veicolo aggiunto alla flotta");
        setName("");
        setBrand("");
        setModel("");
        setBrandId(undefined);
        setVehicleModelId(undefined);
        setPlate("");
        setChassisNumber("");
        setYear("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Aggiungi veicolo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <BrandModelPicker
          onSelect={(r: BrandModelResult) => {
            setBrand(r.brandName);
            setModel(r.modelName);
            setBrandId(r.brandId);
            setVehicleModelId(r.modelId);
            if (r.category && !category) setCategory(r.category);
          }}
        />
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="v-brand">Marca</Label>
            <Input
              id="v-brand"
              value={brand}
              onChange={(e) => {
                setBrand(e.target.value);
                setBrandId(undefined);
                setVehicleModelId(undefined);
              }}
              placeholder="Fiat"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-model">Modello</Label>
            <Input
              id="v-model"
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                setVehicleModelId(undefined);
              }}
              placeholder="Panda"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="v-name">Nome completo (o simile)</Label>
            <Input id="v-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Fiat Panda 1.0 Hybrid" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="v-category">Categoria</Label>
            <Input id="v-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="City Car" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-rate">Tariffa/giorno (EUR)</Label>
            <Input id="v-rate" type="number" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-seats">Posti</Label>
            <Input id="v-seats" type="number" value={seats} onChange={(e) => setSeats(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-transmission">Cambio</Label>
            <Input id="v-transmission" value={transmission} onChange={(e) => setTransmission(e.target.value)} placeholder="Manuale" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="v-fuel">Alimentazione</Label>
            <Input id="v-fuel" value={fuelType} onChange={(e) => setFuelType(e.target.value)} placeholder="Hybrid" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-plate">Targa</Label>
            <div className="flex gap-1">
              <Input id="v-plate" value={plate} onChange={(e) => setPlate(e.target.value)} className="font-mono uppercase" />
              <Button type="button" variant="outline" size="icon" onClick={handlePlateLookup} disabled={lookingUpPlate} title="Cerca dati veicolo dalla targa">
                <Search className="size-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-chassis">Telaio</Label>
            <Input id="v-chassis" value={chassisNumber} onChange={(e) => setChassisNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-year">Anno</Label>
            <Input id="v-year" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Salvataggio..." : "Aggiungi alla flotta"}
        </Button>
      </CardContent>
    </Card>
  );
}
