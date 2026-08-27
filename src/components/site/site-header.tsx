import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/site/user-nav";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Fabri <span className="text-primary">GROUP</span>
        </Link>
        <nav className="flex items-center gap-2">
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
