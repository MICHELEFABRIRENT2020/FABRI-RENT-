import Link from "next/link";
import { requireRole } from "@/lib/session";
import { UserNav } from "@/components/site/user-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("super_admin");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-lg font-bold">
              Fabri <span className="text-primary">Admin</span>
            </Link>
            <nav className="flex flex-wrap gap-4 text-sm">
              <Link href="/admin" className="hover:text-primary">
                Dashboard
              </Link>
              <Link href="/admin/pricing" className="hover:text-primary">
                Tariffe Dinamiche
              </Link>
              <Link href="/admin/parcheggio" className="hover:text-primary">
                Capienza Parcheggio
              </Link>
              <Link href="/admin/flotta" className="hover:text-primary">
                Flotta
              </Link>
              <Link href="/admin/report" className="hover:text-primary">
                Report
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
