import type { Metadata } from "next";
import { getPublicTenant } from "@/lib/tenant";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { StorefrontShell } from "@/components/site/storefront-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getPublicTenant();
  return { title: `Informativa Privacy - ${tenant.name}` };
}

/**
 * Placeholder: the full informativa privacy (base giuridica, finalita',
 * periodo di conservazione) deve essere fornita dal titolare/consulenza
 * legale e pubblicata qui. Questa pagina esiste solo per dare un link reale
 * e funzionante al checkbox di consenso in fase di upload documenti - non
 * costituisce un'informativa privacy completa.
 */
export default async function PrivacyPage() {
  const tenant = await getPublicTenant();

  return (
    <StorefrontShell>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Informativa Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Il testo completo dell&apos;informativa sul trattamento dei dati personali e dei documenti
              caricati e&apos; in fase di pubblicazione.
            </p>
            <p>
              Per qualsiasi informazione sul trattamento dei tuoi dati puoi contattarci direttamente:
            </p>
            <ul className="ml-4 list-disc space-y-1">
              {tenant.email && <li>Email: {tenant.email}</li>}
              {tenant.phone && <li>Telefono: {tenant.phone}</li>}
              {tenant.pec && <li>PEC: {tenant.pec}</li>}
            </ul>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </StorefrontShell>
  );
}
