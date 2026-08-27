"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { updateVehicleDetails } from "@/lib/actions/admin-actions";
import type { VehicleOwnershipType } from "@/generated/prisma/client";

const OWNERSHIP_LABEL: Record<VehicleOwnershipType, string> = {
  aziendale: "Aziendale",
  leasing: "Leasing",
  sub_noleggio: "Sub-noleggio",
  comodato_uso: "Comodato d'uso",
  altro: "Altro",
};

export type VehicleEditDto = {
  id: string;
  name: string;
  brand: string;
  model: string;
  category: string;
  dailyRate: string;
  seats: string;
  transmission: string;
  fuelType: string;
  plate: string;
  chassisNumber: string;
  year: string;
  odometerKm: string;
  bolloExpiryDate: string;
  revisioneExpiryDate: string;
  ownershipType: VehicleOwnershipType;
  purchaseVendor: string;
  purchaseDate: string;
  purchasePrice: string;
  purchasePaymentMethod: string;
};

export function VehicleEditForm({ vehicle }: { vehicle: VehicleEditDto }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState(vehicle);

  function set<K extends keyof VehicleEditDto>(key: K, value: VehicleEditDto[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleSubmit() {
    startTransition(async () => {
      try {
        await updateVehicleDetails({
          id: values.id,
          name: values.name,
          brand: values.brand || undefined,
          model: values.model || undefined,
          category: values.category,
          dailyRate: Number(values.dailyRate),
          seats: values.seats ? Number(values.seats) : undefined,
          transmission: values.transmission || undefined,
          fuelType: values.fuelType || undefined,
          plate: values.plate || undefined,
          chassisNumber: values.chassisNumber || undefined,
          year: values.year ? Number(values.year) : undefined,
          odometerKm: values.odometerKm ? Number(values.odometerKm) : undefined,
          bolloExpiryDate: values.bolloExpiryDate || undefined,
          revisioneExpiryDate: values.revisioneExpiryDate || undefined,
          ownershipType: values.ownershipType,
          purchaseVendor: values.purchaseVendor || undefined,
          purchaseDate: values.purchaseDate || undefined,
          purchasePrice: values.purchasePrice ? Number(values.purchasePrice) : undefined,
          purchasePaymentMethod: values.purchasePaymentMethod || undefined,
        });
        toast.success("Veicolo aggiornato");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dati veicolo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Marca" value={values.brand} onChange={(v) => set("brand", v)} />
          <Field label="Modello" value={values.model} onChange={(v) => set("model", v)} />
          <Field label="Nome completo" value={values.name} onChange={(v) => set("name", v)} className="sm:col-span-2" />
          <Field label="Categoria" value={values.category} onChange={(v) => set("category", v)} />
          <Field label="Tariffa/giorno (EUR)" type="number" value={values.dailyRate} onChange={(v) => set("dailyRate", v)} />
          <Field label="Posti" type="number" value={values.seats} onChange={(v) => set("seats", v)} />
          <Field label="Cambio" value={values.transmission} onChange={(v) => set("transmission", v)} />
          <Field label="Alimentazione" value={values.fuelType} onChange={(v) => set("fuelType", v)} />
          <Field label="Targa" value={values.plate} onChange={(v) => set("plate", v)} />
          <Field label="Telaio" value={values.chassisNumber} onChange={(v) => set("chassisNumber", v)} />
          <Field label="Anno" type="number" value={values.year} onChange={(v) => set("year", v)} />
          <Field label="Km" type="number" value={values.odometerKm} onChange={(v) => set("odometerKm", v)} />
          <Field label="Scadenza Bollo" type="date" value={values.bolloExpiryDate} onChange={(v) => set("bolloExpiryDate", v)} />
          <Field label="Scadenza Revisione" type="date" value={values.revisioneExpiryDate} onChange={(v) => set("revisioneExpiryDate", v)} />
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">Proprieta&apos; e acquisto</h4>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-xs">Proprieta&apos;</Label>
              <Select value={values.ownershipType} onValueChange={(v) => set("ownershipType", v as VehicleOwnershipType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OWNERSHIP_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field label="Venditore" value={values.purchaseVendor} onChange={(v) => set("purchaseVendor", v)} />
            <Field label="Data acquisto" type="date" value={values.purchaseDate} onChange={(v) => set("purchaseDate", v)} />
            <Field label="Prezzo acquisto (EUR)" type="number" value={values.purchasePrice} onChange={(v) => set("purchasePrice", v)} />
            <Field label="Metodo pagamento" value={values.purchasePaymentMethod} onChange={(v) => set("purchasePaymentMethod", v)} />
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Salvataggio..." : "Salva modifiche"}
        </Button>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
