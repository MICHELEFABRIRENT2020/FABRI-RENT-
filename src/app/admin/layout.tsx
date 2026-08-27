import Link from "next/link";
import { requireRole, ADMIN_ROLES } from "@/lib/session";
import { UserNav } from "@/components/site/user-nav";
import { prisma } from "@/lib/prisma";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/pricing", label: "Tariffe Dinamiche" },
  { href: "/admin/parcheggio", label: "Capienza Parcheggio" },
  { href: "/admin/flotta", label: "Flotta" },
  { href: "/admin/utenti", label: "Utenti" },
  { href: "/admin/impostazioni", label: "Impostazioni Contratto" },
  { href: "/admin/report", label: "Report" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(...ADMIN_ROLES);
  const tenant = user.tenantId ? await prisma.tenant.findUnique({ where: { id: user.tenantId } }) : null;

  return (
    <div className="dark flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-baseline gap-2 text-base font-bold tracking-tight">
              FabriGroup <span className="text-primary">Rent Manager</span>
            </Link>
            {tenant && <span className="hidden text-xs text-muted-foreground sm:inline">{tenant.name}</span>}
          </div>
          <UserNav user={user} />
        </div>
        <nav className="mx-auto flex w-full max-w-7xl flex-wrap gap-1 px-4 pb-2 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2.5 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
