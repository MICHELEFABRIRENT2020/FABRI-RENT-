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
