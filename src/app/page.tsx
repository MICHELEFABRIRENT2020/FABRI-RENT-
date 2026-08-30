import type { Metadata } from "next";
import Image from "next/image";
import { BookingWidget } from "@/components/booking/booking-widget";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Clock, MapPin, Wallet, Car, Phone, Smartphone, Mail } from "lucide-react";
import { getPublicTenant } from "@/lib/tenant";
import { DirectionsCard } from "@/components/site/directions-card";
import { FleetShowcase, type ShowcaseVehicle } from "@/components/site/fleet-showcase";
import { prisma } from "@/lib/prisma";

// Homepage Fleet showcase: one real vehicle per category (cheapest first,
// same ordering /api/vehicles and /flotta already use), capped at 6 so the
// homepage stays a preview - not the full 48-vehicle catalog, which lives
// at /flotta. Same data source (prisma.vehicle) and dedupe-by-name logic
// as /flotta/page.tsx - no second source of truth.
const FLEET_SHOWCASE_LIMIT = 6;

async function getFleetShowcaseVehicles(tenantId: string): Promise<ShowcaseVehicle[]> {
  const vehicles = await prisma.vehicle.findMany({
    where: { tenantId, status: "available" },
    orderBy: [{ category: "asc" }, { dailyRate: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      category: true,
      dailyRate: true,
      seats: true,
      transmission: true,
      fuelType: true,
      imageUrl: true,
      isOrSimilar: true,
    },
  });

  const seenNames = new Set<string>();
  const seenCategories = new Set<string>();
  const showcase: ShowcaseVehicle[] = [];

  for (const v of vehicles) {
    if (seenNames.has(v.name) || seenCategories.has(v.category)) continue;
    seenNames.add(v.name);
    seenCategories.add(v.category);
    showcase.push({ ...v, dailyRate: Number(v.dailyRate) });
    if (showcase.length >= FLEET_SHOWCASE_LIMIT) break;
  }

  return showcase;
}

/*
 * Hero visual - no automotive photography exists in the repo yet (see the
 * Step 8 asset audit: only the brand logo, app icons, and Next.js
 * boilerplate SVGs are present, nothing automotive). Once real fleet
 * photography is added under public/, set this to that path (e.g.
 * "/vehicles/hero.jpg") and the panel switches from the icon placeholder
 * to a real next/image render automatically. HERO_IMAGE_OBJECT_POSITION
 * carries one object-position utility per breakpoint (mobile/tablet/desktop
 * each get their own crop framing) - all default to center since there is
 * no photo yet to calibrate against; adjust each value independently once
 * one exists.
 */
const HERO_IMAGE_SRC: string | null = null;
const HERO_IMAGE_OBJECT_POSITION = "object-center md:object-center lg:object-center";

const HIGHLIGHTS = [
  {
    icon: Clock,
    title: "Slot di 24 ore",
    description: "Tariffe calcolate a blocchi esatti di 24 ore, sempre trasparenti.",
  },
  {
    icon: ShieldCheck,
    title: "Assicurazione su misura",
    description: "Franchigie graduate al Sud, KASKO Senza Cauzione al Centro-Nord.",
  },
  {
    icon: MapPin,
    title: "Un'unica sede",
    description: "Ritiro e riconsegna sempre nella nostra sede principale.",
  },
  {
    icon: Wallet,
    title: "Paghi al ritiro",
    description: "Nessun addebito online: saldo e cauzione si regolano direttamente in sede.",
  },
];

const STATS = [
  { value: "100%", label: "Parco Revisionato" },
  { value: "< 5 min", label: "Tempo Ritiro" },
  { value: "24/7", label: "Supporto Clienti" },
];

/*
 * Real services offered, one editorial block per booking flow the Search
 * Widget actually exposes (rent tab / parking tab in booking-widget.tsx).
 * Every fact below is drawn straight from existing business logic - none
 * invented: 24h billing (src/lib/rental-time.ts), insurance zones
 * (src/lib/insurance-zone.ts), Parking Go's slot types/category options
 * and mandatory key handover (ParkingTab in booking-widget.tsx). No
 * airport/station/port transfer claim, no chauffeur/concierge, no extra
 * service not already live in the checkout flow.
 */
const SERVICES = [
  {
    index: "01",
    title: "Noleggio Auto",
    description: "Dalla city car al furgone, ritiro e riconsegna presso la nostra sede.",
    facts: [
      "Tariffe a blocchi esatti di 24 ore, senza sorprese",
      "Assicurazione modulata per zona: franchigie al Sud Italia, KASKO Senza Cauzione al Centro-Nord",
      "Saldo e cauzione gestiti direttamente in sede al ritiro",
    ],
  },
  {
    index: "02",
    title: "Parcheggio (Parking Go)",
    description: "Un posto sicuro per moto, auto o furgone, con consegna chiavi in sede.",
    facts: [
      "Posto auto scoperto o coperto (+40%)",
      "Disponibile per moto, auto e furgoni",
      "Consegna chiavi in sede obbligatoria per l'attivazione del servizio",
    ],
  },
];

/*
 * Real 4-step booking journey, one step per verifiable stage the app
 * actually implements: the Search Widget's own fields (rent/parking tabs,
 * booking-widget.tsx), the representative-vehicle "o simile" pattern
 * (/prenota/rent/page.tsx), the real 4-step checkout wizard (STEPS in
 * rent-checkout-wizard.tsx: Assicurazione / Servizi Extra / Documenti e
 * Fatturazione / Pagamento), and the real digital contract signature +
 * in-person pickup (src/app/firma/[token]/page.tsx, SignatureFlow, plus
 * the already-established pay/deposit-at-pickup fact). No invented
 * timing, delivery method, or procedure.
 */
const HOW_IT_WORKS = [
  {
    index: "01",
    title: "Cerca",
    description: "Scegli data di ritiro/ingresso, riconsegna/uscita e categoria veicolo (o il servizio Parcheggio).",
  },
  {
    index: "02",
    title: "Scegli",
    description: "Ti mostriamo il veicolo disponibile per la categoria scelta, sempre “o simile”.",
  },
  {
    index: "03",
    title: "Prenota",
    description: "Selezioni assicurazione ed eventuali extra, carichi i documenti richiesti e confermi.",
  },
  {
    index: "04",
    title: "Ritira",
    description: "Firmi il contratto e ritiri il veicolo in sede: saldo e cauzione si regolano lì al ritiro.",
  },
];

/*
 * Trust block - only facts independently verifiable in the codebase, no
 * fabricated stats/reviews/badges. Digital signature: src/app/firma/[token]
 * + signature-flow.tsx. Document check: DocumentUploader's 4 real slots
 * (id card front/back, license front/back) in document-uploader.tsx.
 * Payment methods: the real credit_card/debit_card radio in
 * rent-checkout-wizard.tsx step 4. No VAT/PEC shown - the seed values for
 * those are placeholders, not confirmed real business data.
 */
const TRUST = [
  {
    title: "Contratto firmato digitalmente",
    description: "Ogni prenotazione si conferma con firma digitale del contratto, non a voce.",
  },
  {
    title: "Documenti verificati",
    description: "Carta d'identità e patente, fronte e retro, richiesti prima della conferma.",
  },
  {
    title: "Pagamento tracciato",
    description: "Carta di credito o debito: nessun contante, nessun accordo informale.",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getPublicTenant();
  return { title: `${tenant.name} - Noleggio Auto & Parcheggio` };
}

export default async function Home() {
  const tenant = await getPublicTenant();
  const fleetShowcaseVehicles = await getFleetShowcaseVehicles(tenant.id);

  return (
    <div className="storefront flex flex-1 flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <section id="ricerca" className="hero-stage relative overflow-hidden px-4 py-8 sm:py-24">
          <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-12 lg:items-stretch">
            <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-[var(--motion-slow)] flex flex-col lg:col-span-7 lg:justify-between">
              <div className="space-y-6">
                <h1 className="text-balance text-4xl font-extrabold leading-none tracking-tight sm:text-5xl lg:text-7xl">
                  Guidare l&apos;eccellenza.
                  <br />
                  <span className="bg-gradient-to-br from-foreground to-primary bg-clip-text text-transparent">
                    Senza compromessi.
                  </span>
                </h1>
                <p className="max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
                  Dalle city car piu&apos; agili ai SUV, prenota in pochi click il tuo veicolo o il tuo
                  posto auto presso la nostra sede{tenant.address ? ` di ${tenant.address}` : ""}.
                </p>
              </div>
              <div className="mt-8 grid grid-cols-3 gap-4 border-t border-border pt-6 lg:mt-0">
                {STATS.map((stat) => (
                  <div key={stat.label}>
                    <div className="text-2xl leading-tight font-bold tabular-nums text-foreground">{stat.value}</div>
                    <div className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-[var(--motion-slow)] motion-safe:delay-[var(--motion-fast)] flex flex-col gap-6 lg:col-span-5">
              <div className="hero-visual-frame hidden md:block" aria-hidden="true">
                <div className="hero-visual-panel relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-border md:aspect-video lg:aspect-square">
                  {HERO_IMAGE_SRC ? (
                    <Image
                      src={HERO_IMAGE_SRC}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 40vw, (min-width: 768px) 90vw, 100vw"
                      className={`object-cover ${HERO_IMAGE_OBJECT_POSITION}`}
                    />
                  ) : (
                    // Reserved visual area for future fleet photography (see Step 8
                    // audit) - icon communicates the intended subject without
                    // faking a photo. Swap in HERO_IMAGE_SRC above once available.
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Car className="size-16 text-primary/35 lg:size-24" strokeWidth={1} />
                    </div>
                  )}
                  {/* Optional overlay for the future photo (e.g. a gradient for text legibility) - inert/transparent for now. */}
                  <div className="pointer-events-none absolute inset-0" />
                </div>
              </div>
              <p className="flex items-center gap-2 text-xs font-medium text-foreground/90">
                <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                <span>
                  <span className="font-semibold text-foreground">Prenota online.</span> Nessuna telefonata
                  necessaria.
                </span>
              </p>
              <BookingWidget />
            </div>
          </div>
        </section>

        <FleetShowcase vehicles={fleetShowcaseVehicles} fleetHref="/flotta" />

        <section className="mx-auto w-full max-w-6xl px-4 py-16">
          <div className="mb-10 space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">I nostri servizi</h2>
            <p className="text-muted-foreground">
              Noleggio auto e parcheggio, entrambi gestiti direttamente presso la nostra sede.
            </p>
          </div>
          <div className="grid gap-10 border-t border-border pt-10 lg:grid-cols-2 lg:gap-16">
            {SERVICES.map((service) => (
              <div key={service.index} className="space-y-5">
                <span className="text-sm font-bold text-primary">{service.index}</span>
                <h3 className="text-2xl font-bold tracking-tight">{service.title}</h3>
                <p className="text-muted-foreground">{service.description}</p>
                <ul className="space-y-3 border-t border-border pt-5">
                  {service.facts.map((fact) => (
                    <li key={fact} className="flex gap-3 text-sm text-foreground/90">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16">
          <div className="mb-10 space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Come funziona</h2>
            <p className="text-muted-foreground">Dalla ricerca al ritiro, in quattro passaggi.</p>
          </div>
          <div className="grid gap-8 border-t border-border pt-10 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.index} className="space-y-2">
                <span className="text-sm font-bold text-primary">{step.index}</span>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Button asChild size="lg" className="premium-cta text-sm font-bold tracking-wide uppercase">
              <a href="#ricerca">Cerca auto</a>
            </Button>
          </div>

          <div className="mt-16 grid gap-8 border-t border-border pt-10 sm:grid-cols-3">
            {TRUST.map((item) => (
              <div key={item.title} className="space-y-1.5">
                <h3 className="text-sm font-bold tracking-wide text-foreground uppercase">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-16 sm:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map((item) => (
            <Card key={item.title} className="border-border bg-card/70 backdrop-blur">
              <CardContent className="flex flex-col items-start gap-3 pt-6">
                <item.icon className="size-6 text-primary" />
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        {tenant.address && (
          <section className="mx-auto w-full max-w-6xl px-4 pb-16">
            <div className="premium-panel rounded-3xl border border-border bg-card/40 p-8 sm:p-12">
              <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
                <div className="space-y-5">
                  <h2 className="text-3xl font-bold tracking-tight">Contattaci</h2>
                  <p className="max-w-md text-muted-foreground">
                    Ci trovi in sede, oppure prenota direttamente online in pochi minuti.
                  </p>
                  <Button asChild size="lg" className="premium-cta text-sm font-bold tracking-wide uppercase">
                    <a href="#ricerca">Cerca auto</a>
                  </Button>

                  {(tenant.phone || tenant.mobilePhone || tenant.email || tenant.openingHours) && (
                    <ul className="space-y-2 border-t border-border pt-5 text-sm">
                      {tenant.phone && (
                        <li>
                          <a
                            href={`tel:${tenant.phone}`}
                            className="inline-flex items-center gap-2 text-foreground/90 hover:text-primary"
                            aria-label={`Chiama il numero fisso ${tenant.phone}`}
                          >
                            <Phone className="size-4 shrink-0 text-primary" /> {tenant.phone}
                          </a>
                        </li>
                      )}
                      {tenant.mobilePhone && (
                        <li>
                          <a
                            href={`tel:${tenant.mobilePhone}`}
                            className="inline-flex items-center gap-2 text-foreground/90 hover:text-primary"
                            aria-label={`Chiama il cellulare ${tenant.mobilePhone}`}
                          >
                            <Smartphone className="size-4 shrink-0 text-primary" /> {tenant.mobilePhone}
                          </a>
                        </li>
                      )}
                      {tenant.email && (
                        <li>
                          <a
                            href={`mailto:${tenant.email}`}
                            className="inline-flex items-center gap-2 text-foreground/90 hover:text-primary"
                            aria-label={`Scrivi a ${tenant.email}`}
                          >
                            <Mail className="size-4 shrink-0 text-primary" /> {tenant.email}
                          </a>
                        </li>
                      )}
                      {tenant.openingHours && (
                        <li className="inline-flex items-center gap-2 text-muted-foreground">
                          <Clock className="size-4 shrink-0" /> Orari: {tenant.openingHours}
                        </li>
                      )}
                    </ul>
                  )}
                  {tenant.pec && <p className="text-xs text-muted-foreground">PEC: {tenant.pec}</p>}
                </div>
                <DirectionsCard
                  address={tenant.address}
                  officeCoordinates={
                    tenant.latitude != null && tenant.longitude != null
                      ? { latitude: Number(tenant.latitude), longitude: Number(tenant.longitude) }
                      : null
                  }
                />
              </div>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
