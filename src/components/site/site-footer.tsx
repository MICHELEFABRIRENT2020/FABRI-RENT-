import Image from "next/image";
import { getPublicTenant } from "@/lib/tenant";

export async function SiteFooter() {
  const tenant = await getPublicTenant();

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex w-fit items-center rounded-lg bg-white/95 px-2.5 py-1 shadow-sm ring-1 ring-black/5">
          <Image src="/brand/logo.png" alt={tenant.name} width={1140} height={235} className="h-5 w-auto" />
        </span>
        <div className="flex flex-col items-center gap-1 text-center sm:items-start sm:text-left">
          {tenant.address && <p>{tenant.address}</p>}
          {tenant.phone && (
            <a href={`tel:${tenant.phone}`} className="hover:text-primary" aria-label={`Chiama ${tenant.name}`}>
              {tenant.phone}
            </a>
          )}
        </div>
        <div className="flex flex-col items-center gap-1 text-xs opacity-70 sm:items-end">
          {tenant.vatNumber && <p>P.IVA {tenant.vatNumber}</p>}
          <p>Powered by FabriGroup Rent Manager</p>
        </div>
      </div>
    </footer>
  );
}
