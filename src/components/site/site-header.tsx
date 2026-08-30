import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/site/user-nav";
import { getPublicTenant } from "@/lib/tenant";

export async function SiteHeader() {
  const [session, tenant] = await Promise.all([auth(), getPublicTenant()]);

  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="inline-flex items-center">
          <span className="inline-flex items-center rounded-lg bg-white/95 px-3 py-1.5 shadow-sm ring-1 ring-black/5">
            <Image src="/brand/logo.png" alt={tenant.name} width={287} height={56} priority className="h-7 w-auto sm:h-8" />
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/flotta" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Flotta
          </Link>
          {session?.user ? (
            <UserNav user={session.user} />
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Area Riservata</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
