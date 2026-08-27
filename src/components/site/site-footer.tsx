import { getPublicTenant } from "@/lib/tenant";

export async function SiteFooter() {
  const tenant = await getPublicTenant();

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>{tenant.name}</p>
        <p>{tenant.address}</p>
        <p className="text-xs opacity-70">Powered by FabriGroup Rent Manager</p>
      </div>
    </footer>
  );
}
