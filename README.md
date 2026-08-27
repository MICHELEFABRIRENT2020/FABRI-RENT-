# FabriGroup Rent Manager

Gestionale SaaS **multi-tenant** per autonoleggio, parcheggio, flotte,
officina, contratti (con firma digitale), sinistri/danni, multe, blacklist
GDPR, cassa, fatturazione elettronica e centro notifiche - pensato per essere
riconfezionato come prodotto commerciale per piu' clienti (tenant), ciascuno
con le proprie sedi, utenti, flotta e dati, completamente isolati.

Stack: **Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS v4 +
shadcn/ui + PostgreSQL 16 + Prisma 6 + NextAuth v5 + Stripe**. PWA
installabile (manifest + service worker).

## Indice

- [Architettura multi-tenant e ruoli](#architettura-multi-tenant-e-ruoli)
- [Mappa dei moduli](#mappa-dei-moduli)
- [Setup locale](#setup-locale)
- [Credenziali demo](#credenziali-demo-create-da-npm-run-dbseed)
- [Deploy con Docker](#deploy-con-docker)
- [Migrazioni database](#migrazioni-database)
- [Integrazioni esterne](#integrazioni-esterne-cosa-e-reale-cosa-e-stub)
- [Sicurezza](#sicurezza)
- [Cosa NON e' stato implementato in questa sessione](#cosa-non-e-stato-implementato-in-questa-sessione)
- [Test eseguiti](#test-eseguiti)
- [Comandi utili](#comandi-utili)

## Architettura multi-tenant e ruoli

Ogni riga di dominio (veicoli, prenotazioni/contratti, danni, sinistri,
multe, blacklist, documenti, fatture, spese, notifiche...) porta una
`tenantId` e viene sempre filtrata per il tenant dell'utente autenticato
(vedi `src/lib/session.ts`: `requireTenant()` / `assertTenant()`). Un
`Tenant` puo' avere piu' `Location` (sedi).

Ruoli (`UserRole` in `prisma/schema.prisma`), dal piu' al meno privilegiato:

| Ruolo | Accesso |
| --- | --- |
| `super_admin` | Governance globale, tutte le sedi/tenant che amministra |
| `admin` | Governance del proprio tenant |
| `responsabile` | Governance del proprio tenant (no impostazioni sensibili) |
| `operator` | Back-office desk: check-in/out, contratti, cassa |
| `officina` | Modulo Officina (interventi, catalogo) |
| `contabilita` | Cassa, fatture, spese |
| `visualizzatore` | Sola lettura sul back-office |
| `client` | Portale pubblico cliente (prenotazioni proprie) |

Le costanti `STAFF_ROLES` / `WRITE_ROLES` / `ADMIN_ROLES` / `BLACKLIST_ROLES`
in `src/lib/session.ts` centralizzano le policy RBAC usate da layout, server
actions e API route.

## Mappa dei moduli

**Portale pubblico** (`/`, `/prenota/*`) - prenotazione noleggio/parcheggio,
motore assicurativo, upload documenti, pagamento Stripe (cauzione + noleggio
in un'unica PaymentIntent a cattura manuale).

**Back-office Desk** (`/desk/*`, ruoli operativi):

- `/desk` - feed arrivi/partenze, check-in/check-out
- `/desk/contratti` - contratti di noleggio, generazione PDF contratto
  legale con franchigie configurabili, firma digitale (OTP / link / QR),
  invio via WhatsApp (`wa.me`), SMS (`sms:`), email
- `/desk/prolungamenti` - Smart Extension Engine
- `/desk/officina` - interventi meccanica/carrozzeria/gommista/elettrauto,
  catalogo prezzi
- `/desk/danni` - danni veicolo (foto/video/documenti, franchigia, stato)
- `/desk/sinistri` - sinistri assicurativi collegati a contratto/veicolo
- `/desk/multe` + `/desk/multe/enti` - multe con lookup targa -> contratto,
  rubrica PEC enti verbalizzanti, generazione PDF Ricorso
- `/desk/blacklist` - registro clienti non affidabili (GDPR: audit su ogni
  lettura, motivazione obbligatoria)
- `/desk/documenti` - repository documentale trasversale
- `/desk/cassa` - cassa settimanale (incassi per metodo di pagamento, spese
  per categoria, saldo netto giorno/settimana)

**Governance Admin** (`/admin/*`, ruoli di direzione):

- `/admin` - dashboard KPI + Dashboard Flotta Live (stato flotta in tempo
  reale, registro noleggi in corso)
- `/admin/flotta` - anagrafica veicoli compatta (no immagini), assicurazioni,
  proprieta'/acquisto, uscita flotta, colori di scadenza compliance
  (bollo/revisione/assicurazione)
- `/admin/pricing`, `/admin/parcheggio`, `/admin/utenti`,
  `/admin/impostazioni`, `/admin/report`

**Centro notifiche** (campanella in ogni header desk/admin,
`src/lib/notifications.ts`) - calcolato "on read" ad ogni caricamento di
layout: contratto non firmato (critico se oltre le ore 17:00 dello stesso
giorno), rientro imminente/in ritardo, pagamento scaduto, assicurazione /
revisione / bollo in scadenza o scaduti, veicolo in manutenzione/guasto,
danno aperto, multa in scadenza, ricorso/PEC non predisposto, fattura non
inviata allo SDI. Le notifiche gia' risolte si auto-archiviano; quelle lette
o ignorate manualmente restano tali finche' la condizione non cambia.

## Setup locale

```bash
npm install                 # esegue anche `prisma generate` (postinstall)
cp .env.example .env        # valorizza DATABASE_URL e AUTH_SECRET
npm run db:migrate          # applica le migration Prisma
npm run db:seed             # crea tenant demo, utenti, flotta, tariffe
npm run dev                 # http://localhost:3000
```

### Credenziali demo (create da `npm run db:seed`)

Tenant demo: **Fabri Rent Campania**.

| Ruolo | Email | Password |
| --- | --- | --- |
| Admin | `admin@fabrirent.it` | `FabriAdmin!2026` |
| Operatore Desk | `desk@fabrirent.it` | `FabriDesk!2026` |
| Officina | `officina@fabrirent.it` | `FabriOfficina!2026` |
| Contabilita' | `contabilita@fabrirent.it` | `FabriConta!2026` |

## Deploy con Docker

```bash
cp .env.example .env
# valorizza almeno AUTH_SECRET (openssl rand -base64 32) nel .env
docker compose build
docker compose up -d db
docker compose run --rm app npx prisma migrate deploy   # migrazioni, una tantum
docker compose run --rm app npm run db:seed              # opzionale: dati demo
docker compose up -d
```

`docker-compose.yml` avvia Postgres 16 (`db`) e l'app in modalita' standalone
Next.js (`app`, immagine da `Dockerfile` multi-stage). Le migrazioni
**non** vengono eseguite automaticamente all'avvio del container - e' una
scelta deliberata per non rischiare una `migrate deploy` non supervisionata
contro un database di produzione: vanno lanciate a mano (comando sopra) dopo
aver verificato il piano di migrazione.

## Migrazioni database

L'unica migration presente (`20260827112748_init_multi_tenant`) e' uno
squash pulito: in questa sessione di sviluppo il database conteneva solo
dati seed generati da questo stesso progetto, quindi ricreare lo schema da
zero era sicuro. **Per un ambiente con dati reali**, qualunque futura
modifica che introduca colonne `NOT NULL` su tabelle popolate va fatta con
il pattern a stadi (colonna nullable -> backfill applicativo -> `NOT NULL`),
mai con `prisma migrate reset` o con una migration che droppa colonne con
dati.

## Integrazioni esterne (cosa e' reale, cosa e' stub)

Filosofia del progetto: ogni integrazione ha un'interfaccia utente completa
e un livello di servizio dedicato in `src/lib/`; se la variabile d'ambiente
richiesta non e' impostata, la funzione restituisce un esito onesto
"non configurato" (mai un finto successo, mai dati inventati) e la UI
ricade sempre su un percorso manuale.

**Realmente funzionanti senza credenziali aggiuntive:**

- **WhatsApp** - link `wa.me` diretto per inviare il link di firma contratto
- **SMS** - URI `sms:` per l'invio manuale da telefono
- **Upload documenti** (`src/lib/storage.ts`) - salvataggio su disco locale
  in `public/uploads/`

**Configurabili via `.env` (vedi `.env.example`), con fallback esplicito:**

| Servizio | Variabile | Senza chiave |
| --- | --- | --- |
| Stripe | `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` | creazione PaymentIntent/conferma pagamento fallisce lato client (atteso) |
| OTP SMS | `SMS_PROVIDER_API_KEY` | codice OTP stampato nei log server |
| Email | `EMAIL_PROVIDER_API_KEY` | email (contratti, report danni) loggate invece di spedite |
| OCR / AI Vision (`src/lib/ocr-provider.ts`) | `AI_VISION_API_KEY` | scanner documenti mostra "OCR non configurato", form ricade su inserimento manuale |
| Fatturazione elettronica SDI (`src/lib/aruba.ts`) | `ARUBA_SDI_API_KEY` / `ARUBA_SDI_ENDPOINT` | XML fattura generato, invio bloccato con errore esplicito, fattura resta in stato "draft" |

**Riservate per integrazioni future, non ancora lette da alcun codice**
(documentate in `.env.example` per chi riprendera' il lavoro):
`SUMUP_API_KEY`, `GOOGLE_MAPS_API_KEY`, `GPS_PROVIDER_API_KEY`,
`TARGA_LOOKUP_API_KEY` - vedi la sezione successiva per il contesto.

## Sicurezza

- Nessun segreto hardcoded: tutte le chiavi/API key passano da variabili
  d'ambiente (`.env`, mai committato - vedi `.gitignore`).
- Token OTP e link di firma generati con `crypto.randomInt`/`randomBytes`
  (Node `crypto`, CSPRNG), mai con generatori pseudocasuali non sicuri.
- Password utente hashate con `bcryptjs`.
- Ogni azione sensibile (mutazioni desk/admin, incluse le letture della
  Blacklist per compliance GDPR) passa da `logAudit()` (`src/lib/audit.ts`):
  tenant, attore, azione, entita', IP, metadata, timestamp.
- Ogni server action verifica ruolo (`assertRole`/`WRITE_ROLES`/...) *e*
  tenant (`assertTenant`) prima di leggere/scrivere.
- Password demo fornite solo per l'ambiente di sviluppo: da ruotare prima
  di qualunque esposizione pubblica.

## Cosa NON e' stato implementato in questa sessione

Elenco onesto delle richieste della spec che sono state **scaffolded solo a
livello di interfaccia/modello dati** (o non affrontate), da riprendere in
un secondo momento:

- Database globale marche/modelli veicolo con autocomplete
- Lookup targa -> dati veicolo via API esterna (motorizzazione)
- Integrazione Google Maps (Places/Geocoding) per indirizzi/geolocalizzazione
- Tracciamento GPS live dei veicoli (il campo `gpsDeviceId` esiste a schema,
  nessun provider e' collegato)
- Assistente AI conversazionale
- Modulo "Commercialista Virtuale" (analytics fiscali)
- Pubblicazione nativa iOS/Android (l'app e' installabile come PWA, non
  pubblicata sugli store)
- Pipeline CI/CD
- Suite di test automatizzati (unit/e2e) - la verifica in questa sessione e'
  stata manuale: typecheck, build, lint, smoke test Playwright mirati
- Autenticazione a due fattori (2FA) per lo staff
- Rate limiting / protezione CSRF dedicati oltre a quanto NextAuth fornisce
  di default
- Integrazione reale SumUp (il metodo di pagamento esiste come opzione in
  cassa, ma non c'e' un client API SumUp collegato)
- Flusso di creazione contratto "walk-in" lato desk separato dal wizard
  pubblico (il desk oggi opera sulle prenotazioni gia' create dal portale)

## Test eseguiti

Ad ogni modulo completato in questa sessione:

- `npx tsc --noEmit` (typecheck completo)
- `npm run build` (build di produzione Next.js/Turbopack)
- `npm run lint` (ESLint)
- Screenshot/flow manuali con Playwright + Chromium per i moduli con UI
  significativa (dashboard, centro notifiche, contratti, cassa, ecc.)

Tutti verdi all'ultima verifica.

## Comandi utili

```bash
npm run build       # build di produzione
npm run lint         # ESLint
npm run db:studio    # Prisma Studio (browser DB)
npm run db:seed      # ri-esegue il seed (idempotente per email)
```

## Architettura dati

Schema completo in `prisma/schema.prisma`: `Tenant`/`Location`, `User` (con
ruolo e tenant/sede), `Vehicle` + `VehicleInsurancePolicy`, `Booking`
(contratti noleggio e parcheggio), `WorkshopCatalogItem`/
`WorkshopIntervention`, `DamageRecord`, `Claim`, `BlacklistEntry`, `Fine` +
`IssuingAuthority`, `Document`, `Invoice`, `Expense`, `Notification`,
`AuditLog`.

Logica di business in `src/lib/`:

- `session.ts` - RBAC, scoping tenant
- `audit.ts` - audit log
- `notifications.ts` - centro notifiche calcolato on-read
- `rental-time.ts` / `pricing-engine.ts` / `insurance*.ts` /
  `fleet-engine.ts` / `parking-engine.ts` - motori di dominio (slot, tariffe
  dinamiche, assicurazione, assegnazione "o simile", capienza parcheggio)
- `stripe.ts` - PaymentIntent combinata cauzione+noleggio, cattura parziale
- `pdf.ts` - generazione PDF (contratto legale, report/ticket danni,
  fattura, ricorso multa)
- `ocr-provider.ts`, `aruba.ts`, `otp-provider.ts`, `email-provider.ts` -
  integrazioni esterne "stub ma reali" (vedi sopra)
- `week.ts` - cassa settimanale
- `compliance.ts` - colori scadenza bollo/revisione/assicurazione
