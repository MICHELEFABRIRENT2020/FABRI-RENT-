"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VehicleCategoryIcon } from "@/components/booking/vehicle-category-icon";
import { defaultPickupValue, defaultReturnValue } from "@/lib/datetime-input";
import { Gauge, Fuel, Users } from "lucide-react";

export type CatalogVehicle = {
  id: string;
  name: string;
  category: string;
  dailyRate: number;
  seats: number | null;
  transmission: string | null;
  fuelType: string | null;
};

const ALL = "__all__";

export function FleetCatalog({
  vehicles,
  categories,
  initialCategory,
  initialStart,
  initialEnd,
}: {
  vehicles: CatalogVehicle[];
  categories: string[];
  initialCategory?: string;
  initialStart?: string;
  initialEnd?: string;
}) {
  const router = useRouter();

  const [start, setStart] = useState(initialStart || defaultPickupValue());
  const [end, setEnd] = useState(initialEnd || defaultReturnValue());
  const [category, setCategory] = useState(
    initialCategory && categories.includes(initialCategory) ? initialCategory : ALL
  );
  const [transmission, setTransmission] = useState(ALL);
  const [fuelType, setFuelType] = useState(ALL);

  const transmissions = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.transmission).filter((v): v is string => !!v))).sort(),
    [vehicles]
  );
  const fuelTypes = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.fuelType).filter((v): v is string => !!v))).sort(),
    [vehicles]
  );

  const filtered = useMemo(
    () =>
      vehicles.filter(
        (v) =>
          (category === ALL || v.category === category) &&
          (transmission === ALL || v.transmission === transmission) &&
          (fuelType === ALL || v.fuelType === fuelType)
      ),
    [vehicles, category, transmission, fuelType]
  );

  function bookCategory(vehicleCategory: string, vehicleName: string) {
    const qs = new URLSearchParams({ start, end, category: vehicleCategory, model: vehicleName });
    router.push(`/prenota/rent?${qs.toString()}`);
  }

  return (
    <div className="space-y-8">
      <Card className="border-border bg-card/70 backdrop-blur">
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor="fleet-start">Ritiro</Label>
            <Input id="fleet-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fleet-end">Riconsegna</Label>
            <Input id="fleet-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tutte le categorie</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Cambio</Label>
            <Select value={transmission} onValueChange={setTransmission}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tutti</SelectItem>
                {transmissions.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Alimentazione</Label>
            <Select value={fuelType} onValueChange={setFuelType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tutte</SelectItem>
                {fuelTypes.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          Nessun veicolo corrisponde ai filtri selezionati.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => (
            <Card key={v.id} className="flex flex-col border-border bg-card/70 backdrop-blur">
              <CardContent className="flex flex-1 flex-col gap-4 pt-6">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="secondary">{v.category}</Badge>
                  <Badge variant="outline">O SIMILE</Badge>
                </div>

                <VehicleCategoryIcon category={v.category} className="h-32 w-full" iconClassName="size-12" />

                <h3 className="font-semibold leading-tight">{v.name}</h3>

                <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5" /> {v.seats ?? "-"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Gauge className="size-3.5" /> {v.transmission ?? "-"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Fuel className="size-3.5" /> {v.fuelType ?? "-"}
                  </span>
                </div>

                <div className="mt-auto flex items-center justify-between pt-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Da</p>
                    <p className="text-xl font-bold text-primary">
                      {v.dailyRate.toFixed(0)}&euro;{" "}
                      <span className="text-xs font-normal text-muted-foreground">/giorno</span>
                    </p>
                  </div>
                  <Button className="h-11" onClick={() => bookCategory(v.category, v.name)}>
                    Prenota
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
