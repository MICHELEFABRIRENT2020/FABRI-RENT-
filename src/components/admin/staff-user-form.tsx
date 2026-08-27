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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { createStaffUser } from "@/lib/actions/admin-actions";
import type { AppUserRole } from "@/types/next-auth";

const ROLE_OPTIONS: { value: AppUserRole; label: string }[] = [
  { value: "admin", label: "Amministratore" },
  { value: "responsabile", label: "Responsabile" },
  { value: "operator", label: "Operatore Desk" },
  { value: "officina", label: "Officina" },
  { value: "contabilita", label: "Contabilita'" },
  { value: "visualizzatore", label: "Visualizzatore (sola lettura)" },
];

export function StaffUserForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<AppUserRole>("operator");
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  function handleSubmit() {
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      toast.error("Compila nome, email e telefono.");
      return;
    }
    startTransition(async () => {
      try {
        const { temporaryPassword } = await createStaffUser({ fullName, email, phone, role });
        setCreatedPassword(temporaryPassword);
        setFullName("");
        setEmail("");
        setPhone("");
        toast.success("Utente creato");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nuovo utente staff</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {createdPassword && (
          <Alert>
            <AlertTitle>Password temporanea generata</AlertTitle>
            <AlertDescription>
              Comunica questa password all&apos;utente in modo sicuro (non verra&apos; mostrata di nuovo):{" "}
              <code className="font-mono">{createdPassword}</code>
            </AlertDescription>
          </Alert>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="staff-name">Nome e Cognome</Label>
            <Input id="staff-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-email">Email</Label>
            <Input id="staff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-phone">Telefono</Label>
            <Input id="staff-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Ruolo</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppUserRole)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Creazione..." : "Crea utente"}
        </Button>
      </CardContent>
    </Card>
  );
}
