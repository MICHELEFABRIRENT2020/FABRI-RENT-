"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { defaultPickupValue, defaultReturnValue } from "@/lib/datetime-input";
import { Car, MapPin, ParkingCircle } from "lucide-react";
import { toast } from "sonner";

const VEHICLE_CATEGORIES = [
  { value: "City Car", label: "City Car - es. Fiat Panda o simile" },
  { value: "Berlina Compatta", label: "Berlina Compatta - es. Fiat Tipo o simile" },
  { value: "Premium", label: "Premium - es. Audi A1, Mercedes Classe A" },
  { value: "SUV Compatto", label: "SUV Compatto - es. Opel Mokka o simile" },
  { value: "Monovolume", label: "Monovolume 7 posti - es. Peugeot 5008" },
  { value: "Scooter", label: "Scooter - es. Aprilia Tweet 125" },
  { value: "Furgone", label: "Furgone - es. Fiat Ducato o simile" },
];

export function BookingWidget() {
  const router = useRouter();

  return (
    <Card className="w-full border-border bg-card/70 shadow-[0_0_50px_-10px_var(--accent)] backdrop-blur-xl">
      <CardContent className="pt-6">
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4" />
          <span>Ritiro e riconsegna presso Via Privata Detta Sacra 33</span>
        </div>
        <Tabs defaultValue="rent">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rent" className="gap-2">
              <Car className="size-4" /> Noleggio Auto
            </TabsTrigger>
            <TabsTrigger value="parking" className="gap-2">
              <ParkingCircle className="size-4" /> Parcheggio (Parking Go)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rent" className="pt-4">
            <RentTab
              onSearch={(params) => {
                const qs = new URLSearchParams(params);
                router.push(`/prenota/rent?${qs.toString()}`);
              }}
            />
          </TabsContent>

          <TabsContent value="parking" className="pt-4">
            <ParkingTab
              onSearch={(params) => {
                const qs = new URLSearchParams(params);
                router.push(`/prenota/parcheggio?${qs.toString()}`);
              }}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function RentTab({ onSearch }: { onSearch: (params: Record<string, string>) => void }) {
  const [start, setStart] = useState(defaultPickupValue());
  const [end, setEnd] = useState(defaultReturnValue());
  const [category, setCategory] = useState(VEHICLE_CATEGORIES[0].value);

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch({ start, end, category });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="rent-start">Ritiro</Label>
        <Input id="rent-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="rent-end">Riconsegna</Label>
        <Input id="rent-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="rent-category">Categoria veicolo</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="rent-category" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VEHICLE_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" size="lg" className="sm:col-span-2">
        Cerca disponibilita&apos;
      </Button>
    </form>
  );
}

function ParkingTab({ onSearch }: { onSearch: (params: Record<string, string>) => void }) {
  const [start, setStart] = useState(defaultPickupValue());
  const [end, setEnd] = useState(defaultReturnValue());
  const [category, setCategory] = useState("auto");
  const [slotType, setSlotType] = useState("scoperto");
  const [keysLeft, setKeysLeft] = useState(false);

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!keysLeft) {
          toast.error('La checkbox "Consegna chiavi in sede" e\' obbligatoria per il servizio Parking Go.');
          return;
        }
        onSearch({ start, end, category, slotType, keysLeft: String(keysLeft) });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="park-start">Ingresso</Label>
        <Input id="park-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="park-end">Uscita</Label>
        <Input id="park-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="park-category">Categoria</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="park-category" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="moto">Moto</SelectItem>
            <SelectItem value="auto">Auto</SelectItem>
            <SelectItem value="furgone">Furgone</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="park-slot">Tipo posto</Label>
        <Select value={slotType} onValueChange={setSlotType}>
          <SelectTrigger id="park-slot" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scoperto">Scoperto</SelectItem>
            <SelectItem value="coperto">Coperto (+40%)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <Checkbox id="keysLeft" checked={keysLeft} onCheckedChange={(v) => setKeysLeft(v === true)} />
        <Label htmlFor="keysLeft" className="font-normal">
          Consegna chiavi in sede <span className="text-destructive">*</span>
        </Label>
      </div>
      <Button type="submit" size="lg" className="sm:col-span-2">
        Verifica disponibilita&apos;
      </Button>
    </form>
  );
}
