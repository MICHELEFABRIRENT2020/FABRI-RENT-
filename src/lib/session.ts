import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { AppUserRole } from "@/types/next-auth";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

export async function requireRole(...roles: AppUserRole[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/");
  return user;
}

/** Same role check as `requireRole`, but throws instead of redirecting - use inside Server Actions/API routes invoked as RPC calls. */
export async function assertRole(...roles: AppUserRole[]) {
  const session = await auth();
  if (!session?.user || !roles.includes(session.user.role)) {
    throw new Error("Non autorizzato");
  }
  return session.user;
}

/** Requires a logged-in, tenant-scoped user (any staff role) and returns their tenantId. Redirects to /login otherwise. */
export async function requireTenant() {
  const user = await requireUser();
  if (!user.tenantId) redirect("/");
  return { user, tenantId: user.tenantId };
}

/** Same as `requireTenant`, but throws instead of redirecting - use inside Server Actions/API routes. */
export async function assertTenant() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error("Nessun tenant associato all'utente.");
  }
  return { user: session.user, tenantId: session.user.tenantId };
}

/** Roles allowed inside the desk/admin back-office shell (every staff role except plain customers). */
export const STAFF_ROLES: AppUserRole[] = [
  "super_admin",
  "admin",
  "responsabile",
  "operator",
  "officina",
  "contabilita",
  "visualizzatore",
];

/** Roles that can write/mutate data (everything except the read-only viewer role). */
export const WRITE_ROLES: AppUserRole[] = ["super_admin", "admin", "responsabile", "operator", "officina", "contabilita"];

/** Roles allowed into the governance/admin panel. */
export const ADMIN_ROLES: AppUserRole[] = ["super_admin", "admin", "responsabile"];

/** Sensitive registry: visibility limited to management + desk roles (not officina/contabilita/visualizzatore). */
export const BLACKLIST_ROLES: AppUserRole[] = ["super_admin", "admin", "responsabile", "operator"];

export function canWrite(role: AppUserRole): boolean {
  return WRITE_ROLES.includes(role);
}
