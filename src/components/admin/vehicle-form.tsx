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
  const [category, setCategory] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [seats, setSeats] = useState("");
  const [transmission, setTransmission] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [plate, setPlate] = useState("");

  function handleSubmit() {
    if (!name.trim() || !category.trim() || !dailyRate) {
      toast.error("Compila nome, categoria e tariffa giornaliera.");
      return;
    }
    startTransition(async () => {
      try {
        await createVehicle({
          name,
          category,
          dailyRate: Number(dailyRate),
          seats: seats ? Number(seats) : undefined,
          transmission: transmission || undefined,
          fuelType: fuelType || undefined,
          plate: plate || undefined,
        });
        toast.success("Veicolo aggiunto alla flotta");
        setName("");
        setPlate("");
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
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="v-name">Nome / Modello</Label>
            <Input id="v-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Fiat Panda 1.0 Hybrid" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-category">Categoria</Label>
            <Input id="v-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="City Car" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-rate">Tariffa giornaliera (EUR)</Label>
            <Input id="v-rate" type="number" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="v-seats">Posti</Label>
            <Input id="v-seats" type="number" value={seats} onChange={(e) => setSeats(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-transmission">Cambio</Label>
            <Input id="v-transmission" value={transmission} onChange={(e) => setTransmission(e.target.value)} placeholder="Manuale" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-fuel">Alimentazione</Label>
            <Input id="v-fuel" value={fuelType} onChange={(e) => setFuelType(e.target.value)} placeholder="Hybrid" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-plate">Targa</Label>
            <Input id="v-plate" value={plate} onChange={(e) => setPlate(e.target.value)} />
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Salvataggio..." : "Aggiungi alla flotta"}
        </Button>
      </CardContent>
    </Card>
  );
}
