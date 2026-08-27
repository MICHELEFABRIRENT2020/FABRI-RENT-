import Link from "next/link";
import { requireUser } from "@/lib/session";
import { UserNav } from "@/components/site/user-nav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="dark flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-baseline gap-2 text-base font-bold tracking-tight">
            FabriGroup <span className="text-primary">Rent Manager</span>
          </Link>
          <UserNav user={user} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
