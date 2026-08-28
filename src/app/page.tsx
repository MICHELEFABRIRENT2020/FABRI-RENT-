import type { Metadata } from "next";
import { BookingWidget } from "@/components/booking/booking-widget";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Clock, MapPin, Wallet, Car } from "lucide-react";
import { getPublicTenant } from "@/lib/tenant";
import { DirectionsCard } from "@/components/site/directions-card";

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

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getPublicTenant();
  return { title: `${tenant.name} - Noleggio Auto & Parcheggio` };
}

export default async function Home() {
  const tenant = await getPublicTenant();

  return (
    <div className="storefront flex flex-1 flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <section className="relative overflow-hidden px-4 py-16 sm:py-24">
          <div className="pointer-events-none absolute -top-24 right-1/2 h-72 w-72 translate-x-1/2 rounded-full bg-primary/10 blur-3xl sm:right-24 sm:translate-x-0" />
          <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-12 lg:items-stretch lg:gap-12">
            <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 flex flex-col lg:col-span-7 lg:justify-between">
              <div className="space-y-6">
                <h1 className="text-balance text-5xl font-extrabold leading-none tracking-tight lg:text-7xl">
                  Guidare l&apos;eccellenza.
                  <br />
                  <span className="bg-gradient-to-br from-foreground to-primary bg-clip-text text-transparent">
                    Senza compromessi.
                  </span>
                </h1>
                <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
                  Dalle city car piu&apos; agili ai SUV, prenota in pochi click il tuo veicolo o il tuo
                  posto auto presso la nostra sede{tenant.address ? ` di ${tenant.address}` : ""}.
                </p>
              </div>
              <div className="mt-10 grid grid-cols-3 gap-4 border-t border-border pt-6 lg:mt-0">
                {STATS.map((stat) => (
                  <div key={stat.label}>
                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                    <div className="text-xs font-semibold uppercase text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:delay-150 flex flex-col gap-6 lg:col-span-5">
              <div className="hero-visual-frame hidden md:block" aria-hidden="true">
                <div className="hero-visual-panel relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-border md:aspect-video lg:aspect-square">
                  {/*
                    Image slot: once fleet photography is available, replace the
                    icon below with `<Image fill alt="" className="object-cover"
                    style={{ objectPosition: "center" }} />` - the panel is
                    already relative/overflow-hidden with a responsive
                    aspect-ratio (portrait on the (currently hidden) mobile
                    size, video/16:9 on tablet, near-square on desktop) so no
                    single fixed crop is baked in.
                  */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Car className="size-16 text-primary/35 lg:size-24" strokeWidth={1} />
                  </div>
                  {/* Optional overlay for the future photo (e.g. a gradient for text legibility) - inert/transparent for now. */}
                  <div className="pointer-events-none absolute inset-0" />
                </div>
              </div>
              <BookingWidget />
            </div>
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
            <DirectionsCard
              address={tenant.address}
              officeCoordinates={
                tenant.latitude != null && tenant.longitude != null
                  ? { latitude: Number(tenant.latitude), longitude: Number(tenant.longitude) }
                  : null
              }
            />
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
