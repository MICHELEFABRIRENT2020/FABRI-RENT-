"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { updateStaffUserRole, resetStaffPassword } from "@/lib/actions/admin-actions";
import type { AppUserRole } from "@/types/next-auth";

const ROLE_LABEL: Record<AppUserRole, string> = {
  super_admin: "Super Admin",
  admin: "Amministratore",
  responsabile: "Responsabile",
  operator: "Operatore Desk",
  officina: "Officina",
  contabilita: "Contabilita'",
  visualizzatore: "Visualizzatore",
  client: "Cliente",
};

const ASSIGNABLE: AppUserRole[] = ["admin", "responsabile", "operator", "officina", "contabilita", "visualizzatore"];

export type StaffUserDto = { id: string; fullName: string; email: string; phone: string; role: AppUserRole };

export function StaffUserTable({ users }: { users: StaffUserDto[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Telefono</TableHead>
          <TableHead>Ruolo</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.id}>
            <TableCell>{u.fullName}</TableCell>
            <TableCell>{u.email}</TableCell>
            <TableCell>{u.phone}</TableCell>
            <TableCell>
              <Select
                value={u.role}
                disabled={isPending}
                onValueChange={(role) =>
                  startTransition(async () => {
                    await updateStaffUserRole(u.id, role as AppUserRole);
                    router.refresh();
                  })
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const { temporaryPassword } = await resetStaffPassword(u.id);
                    toast.success(`Nuova password temporanea: ${temporaryPassword}`, { duration: 15000 });
                    router.refresh();
                  })
                }
              >
                Reset password
              </Button>
            </TableCell>
          </TableRow>
        ))}
        {users.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              Nessun utente staff.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
