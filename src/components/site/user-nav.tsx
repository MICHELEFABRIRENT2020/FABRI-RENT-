"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AppUserRole } from "@/types/next-auth";

const ROLE_LABEL: Record<AppUserRole, string> = {
  client: "Cliente",
  operator: "Operatore Desk",
  super_admin: "Amministratore",
};

const ROLE_HOME: Record<AppUserRole, string> = {
  client: "/",
  operator: "/desk",
  super_admin: "/admin",
};

export function UserNav({ user }: { user: { name?: string | null; role: AppUserRole } }) {
  return (
    <div className="flex items-center gap-3">
      <Badge variant="secondary">{ROLE_LABEL[user.role]}</Badge>
      {user.role !== "client" && (
        <Button asChild variant="ghost" size="sm">
          <Link href={ROLE_HOME[user.role]}>Pannello</Link>
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
        Esci
      </Button>
    </div>
  );
}
