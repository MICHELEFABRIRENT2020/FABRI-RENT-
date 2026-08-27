import Link from "next/link";
import { requireRole, STAFF_ROLES } from "@/lib/session";
import { UserNav } from "@/components/site/user-nav";
import { NotificationBell } from "@/components/site/notification-bell";
import { prisma } from "@/lib/prisma";
import { refreshNotifications, listActiveNotifications } from "@/lib/notifications";

const NAV = [
  { href: "/desk", label: "Arrivi / Partenze" },
  { href: "/desk/contratti", label: "Contratti" },
  { href: "/desk/prolungamenti", label: "Prolungamenti" },
  { href: "/desk/officina", label: "Officina" },
  { href: "/desk/danni", label: "Danni" },
  { href: "/desk/sinistri", label: "Sinistri" },
  { href: "/desk/multe", label: "Multe" },
  { href: "/desk/blacklist", label: "Blacklist" },
  { href: "/desk/documenti", label: "Documenti" },
  { href: "/desk/cassa", label: "Cassa" },
];

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(...STAFF_ROLES);
  const tenant = user.tenantId ? await prisma.tenant.findUnique({ where: { id: user.tenantId } }) : null;
  if (user.tenantId) await refreshNotifications(user.tenantId);
  const notifications = user.tenantId ? await listActiveNotifications(user.tenantId) : [];

  return (
    <div className="dark flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/desk" className="flex items-baseline gap-2 text-base font-bold tracking-tight">
              FabriGroup <span className="text-primary">Rent Manager</span>
            </Link>
            {tenant && <span className="hidden text-xs text-muted-foreground sm:inline">{tenant.name}</span>}
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell notifications={notifications} />
            <UserNav user={user} />
          </div>
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
