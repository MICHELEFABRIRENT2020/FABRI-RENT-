"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateTenantProfile } from "@/lib/actions/admin-actions";

export type TenantProfileDto = { name: string; vatNumber: string; pec: string; sdiCode: string; address: string };

export function TenantProfileForm({ profile }: { profile: TenantProfileDto }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState(profile);

  function handleSubmit() {
    startTransition(async () => {
      try {
        await updateTenantProfile(values);
        toast.success("Anagrafica azienda aggiornata");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Anagrafica azienda</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Ragione sociale</Label>
            <Input value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>P.IVA</Label>
            <Input value={values.vatNumber} onChange={(e) => setValues((v) => ({ ...v, vatNumber: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>PEC</Label>
            <Input value={values.pec} onChange={(e) => setValues((v) => ({ ...v, pec: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Codice SDI</Label>
            <Input maxLength={7} value={values.sdiCode} onChange={(e) => setValues((v) => ({ ...v, sdiCode: e.target.value }))} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Indirizzo sede</Label>
            <Input value={values.address} onChange={(e) => setValues((v) => ({ ...v, address: e.target.value }))} />
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Salvataggio..." : "Salva anagrafica"}
        </Button>
      </CardContent>
    </Card>
  );
}
