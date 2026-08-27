import Link from "next/link";
import { requireRole, STAFF_ROLES } from "@/lib/session";
import { UserNav } from "@/components/site/user-nav";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(...STAFF_ROLES);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/desk" className="text-lg font-bold">
              Fabri <span className="text-primary">Desk</span>
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/desk" className="hover:text-primary">
                Arrivi / Partenze
              </Link>
              <Link href="/desk/prolungamenti" className="hover:text-primary">
                Prolungamenti
              </Link>
            </nav>
          </div>
          <UserNav user={user} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
