"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export type InvoiceFormValues = {
  fullName: string;
  email: string;
  phone: string;
  companyName: string;
  vatNumber: string;
  sdiCode: string;
  pec: string;
};

export function InvoiceForm({
  values,
  onChange,
}: {
  values: InvoiceFormValues;
  onChange: (values: InvoiceFormValues) => void;
}) {
  function set<K extends keyof InvoiceFormValues>(key: K, value: InvoiceFormValues[K]) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nome e Cognome</Label>
          <Input id="fullName" required value={values.fullName} onChange={(e) => set("fullName", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={values.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Cellulare</Label>
          <Input id="phone" required value={values.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-sm font-semibold">Fatturazione elettronica (opzionale)</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyName">Ragione Sociale / Nome</Label>
            <Input id="companyName" value={values.companyName} onChange={(e) => set("companyName", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vatNumber">P.IVA / Codice Fiscale</Label>
            <Input id="vatNumber" value={values.vatNumber} onChange={(e) => set("vatNumber", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sdiCode">Codice Univoco (SDI)</Label>
            <Input id="sdiCode" maxLength={7} value={values.sdiCode} onChange={(e) => set("sdiCode", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pec">PEC</Label>
            <Input id="pec" type="email" value={values.pec} onChange={(e) => set("pec", e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
}
