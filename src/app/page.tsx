import { BookingWidget } from "@/components/booking/booking-widget";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Clock, MapPin, CreditCard } from "lucide-react";

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
    description: "Ritiro e riconsegna sempre in Via Privata Detta Sacra 33.",
  },
  {
    icon: CreditCard,
    title: "Pagamento sicuro",
    description: "Pre-autorizzazione cauzionale o addebito diretto tramite Stripe.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <section className="relative flex flex-col items-center gap-10 overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background px-4 py-16 sm:py-24">
          <div className="max-w-2xl text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-wide text-primary">
              Fabri GROUP - Fabri Rent Campania
            </p>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              Noleggio auto e parcheggio, tutto in un&apos;unica piattaforma
            </h1>
            <p className="mt-4 text-pretty text-muted-foreground sm:text-lg">
              Prenota in pochi click il tuo veicolo o il tuo posto auto presso la nostra
              sede di Via Privata Detta Sacra 33.
            </p>
          </div>
          <BookingWidget />
        </section>

        <section className="mx-auto grid w-full max-w-5xl gap-4 px-4 py-16 sm:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map((item) => (
            <Card key={item.title}>
              <CardContent className="flex flex-col items-start gap-3 pt-6">
                <item.icon className="size-6 text-primary" />
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
