"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  const [billingOpen, setBillingOpen] = useState(false);

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

      <Collapsible open={billingOpen} onOpenChange={setBillingOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 py-2 text-left">
          <h4 className="text-sm font-semibold">Fatturazione elettronica (opzionale)</h4>
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${billingOpen ? "rotate-180" : ""}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
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
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
