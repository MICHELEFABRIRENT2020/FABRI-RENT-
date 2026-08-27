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
