"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createVehicle } from "@/lib/actions/admin-actions";

export function VehicleForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [category, setCategory] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [seats, setSeats] = useState("");
  const [transmission, setTransmission] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [plate, setPlate] = useState("");
  const [chassisNumber, setChassisNumber] = useState("");
  const [year, setYear] = useState("");

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
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="v-brand">Marca</Label>
            <Input id="v-brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Fiat" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-model">Modello</Label>
            <Input id="v-model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Panda" />
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
            <Input id="v-plate" value={plate} onChange={(e) => setPlate(e.target.value)} />
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
