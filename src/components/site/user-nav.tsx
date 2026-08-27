"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AppUserRole } from "@/types/next-auth";

const ROLE_LABEL: Record<AppUserRole, string> = {
  client: "Cliente",
  operator: "Operatore Desk",
  officina: "Officina",
  contabilita: "Contabilita'",
  visualizzatore: "Visualizzatore",
  responsabile: "Responsabile",
  admin: "Amministratore",
  super_admin: "Super Admin",
};

const ADMIN_HOME_ROLES = new Set<AppUserRole>(["super_admin", "admin", "responsabile"]);

function homeFor(role: AppUserRole): string {
  if (role === "client") return "/";
  if (ADMIN_HOME_ROLES.has(role)) return "/admin";
  return "/desk";
}

export function UserNav({ user }: { user: { name?: string | null; role: AppUserRole } }) {
  return (
    <div className="flex items-center gap-3">
      <Badge variant="secondary">{ROLE_LABEL[user.role]}</Badge>
      {user.role !== "client" && (
        <Button asChild variant="ghost" size="sm">
          <Link href={homeFor(user.role)}>Pannello</Link>
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
        Esci
      </Button>
    </div>
  );
}
