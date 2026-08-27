import type { DefaultSession } from "next-auth";

export type AppUserRole =
  | "super_admin"
  | "admin"
  | "responsabile"
  | "operator"
  | "officina"
  | "contabilita"
  | "visualizzatore"
  | "client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppUserRole;
      tenantId: string | null;
      locationId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: AppUserRole;
    tenantId: string | null;
    locationId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: AppUserRole;
    tenantId: string | null;
    locationId: string | null;
  }
}
