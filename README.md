# Fabri GROUP - All-in-One Mobility Platform

Piattaforma full-stack per **Fabri Rent Campania**: noleggio auto, parcheggio
(Parking Go), onboarding clienti, back-office desk e governance direzionale,
centralizzati su un'unica sede (**Via Privata Detta Sacra 33**).

Stack: **Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui +
PostgreSQL + Prisma + NextAuth v5 + Stripe**.

## Moduli

1. **Portale Cliente** (`/`, `/prenota/*`) - widget di prenotazione a tab
   (Noleggio Auto / Parcheggio), catalogo flotta dinamico con modello
   "categoria/modello o simile", motore assicurativo geo-localizzato,
   upload documenti a 4 slot, fatturazione elettronica, pagamento Stripe.
2. **Back-Office Desk** (`/desk`, ruoli `operator`/`super_admin`) - feed
   arrivi/partenze, audit documenti, check-in (firma digitale o OTP SMS),
   log foto danni preesistenti, check-out con penalty engine e ticket
   danni, Smart Extension Engine, override manuale prezzo.
3. **Governance Super Admin** (`/admin`, ruolo `super_admin`) - tariffe
   dinamiche stagionali, capienza massima parcheggio, gestione flotta,
   report finanziari con export CSV/Excel.

## Setup locale

```bash
npm install                 # esegue anche `prisma generate` (postinstall)
cp .env.example .env        # valorizza DATABASE_URL e AUTH_SECRET
npm run db:migrate          # applica le migration Prisma
npm run db:seed             # crea utenti demo, flotta, tariffe, assicurazioni
npm run dev                 # http://localhost:3000
```

### Credenziali demo (create da `npm run db:seed`)

| Ruolo | Email | Password |
| --- | --- | --- |
| Super Admin | `admin@fabrirent.it` | `FabriAdmin!2026` |
| Operatore Desk | `desk@fabrirent.it` | `FabriDesk!2026` |

### Integrazioni esterne

Stripe, l'invio SMS/OTP e l'invio email sono configurati con provider reali
ma **degradano automaticamente in modalita' sviluppo** se le relative
variabili d'ambiente non sono impostate (vedi `.env.example`):

- **Stripe**: senza `STRIPE_SECRET_KEY`/`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  validi, la creazione delle PaymentIntent e la conferma pagamento lato
  client falliranno (comportamento atteso); il resto del flusso di
  prenotazione funziona regolarmente.
- **OTP SMS** (`src/lib/otp-provider.ts`): senza `SMS_PROVIDER_API_KEY` il
  codice viene stampato nei log del server invece di essere inviato.
- **Email** (`src/lib/email-provider.ts`): senza `EMAIL_PROVIDER_API_KEY`
  le email (report danni, contratti PDF) vengono loggate invece di essere
  spedite.
- **Upload file** (`src/lib/storage.ts`): salva su disco locale in
  `public/uploads/`; da sostituire con S3/Cloud Storage prima di un deploy
  su infrastruttura a filesystem effimero (es. serverless).

## Comandi utili

```bash
npm run build       # build di produzione
npm run lint         # ESLint
npm run db:studio    # Prisma Studio (browser DB)
```

## Architettura dati

Schema completo in `prisma/schema.prisma`: utenti/ruoli, flotta, tariffe
dinamiche, opzioni assicurative geo-localizzate, servizi extra, prenotazioni,
audit documenti, report/ticket danni, richieste di prolungamento, pagamenti
Stripe, log di audit.

Logica di business in `src/lib/`:

- `rental-time.ts` - motore slot 24h e calcolo penale ritardo
- `pricing-engine.ts` - tariffe dinamiche (stagione/weekend/festivita')
- `insurance*.ts` - motore assicurativo Sud vs Centro/Nord Italia
- `fleet-engine.ts` - assegnazione "o simile" e riassegnazione automatica
  per i prolungamenti
- `parking-engine.ts` - cap di capienza parcheggio anti-overbooking
- `stripe.ts` - pre-autorizzazione cauzione combinata con addebito
  noleggio, addebito diretto KASKO
- `booking-service.ts` - orchestrazione creazione prenotazione
