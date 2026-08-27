# FabriGroup Rent Manager

Gestionale SaaS **multi-tenant** per autonoleggio, parcheggio, flotte,
officina, contratti (con firma digitale), sinistri/danni, multe, blacklist
GDPR, cassa, fatturazione elettronica, centro notifiche, assistente AI e
Commercialista Virtuale - pensato per essere riconfezionato come prodotto
commerciale per piu' clienti (tenant), ciascuno con le proprie sedi, utenti,
flotta e dati, completamente isolati.

Stack: **Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS v4 +
shadcn/ui + PostgreSQL 16 + Prisma 6 + NextAuth v5 (con 2FA TOTP) + Stripe +
SumUp**. PWA installabile + shell nativa Capacitor (iOS/Android).

## Documentazione

Questo file copre l'overview e il setup rapido. Per il dettaglio:

- [SECURITY.md](./SECURITY.md) - postura di sicurezza completa (auth, 2FA,
  RBAC, CSRF, rate limiting, validazione, header, segreti, audit trail)
- [DEPLOYMENT.md](./DEPLOYMENT.md) - deploy, migrazioni, rollback, scalabilita'
- [INTEGRATIONS.md](./INTEGRATIONS.md) - stato reale di ogni integrazione esterna
- [TESTING.md](./TESTING.md) - come eseguire ogni suite di test, cosa copre
- [MOBILE.md](./MOBILE.md) - shell nativa Capacitor, cosa manca per gli store
- [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) - audit funzionalita' per funzionalita'
- [FINAL_IMPLEMENTATION_REPORT.md](./FINAL_IMPLEMENTATION_REPORT.md) - report finale del programma di lavoro produzione-ready
- [AUDIT_AFTER_IMPLEMENTATION.md](./AUDIT_AFTER_IMPLEMENTATION.md) - audit indipendente post-implementazione

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
| `contabilita` | Cassa, fatture, spese, Commercialista Virtuale |
| `visualizzatore` | Sola lettura sul back-office |
| `client` | Portale pubblico cliente (prenotazioni proprie) |

Le costanti `STAFF_ROLES` / `WRITE_ROLES` / `ADMIN_ROLES` / `BLACKLIST_ROLES`
in `src/lib/session.ts` centralizzano le policy RBAC usate da layout, server
actions e API route.

## Mappa dei moduli

**Portale pubblico** (`/`, `/prenota/*`) - prenotazione noleggio/parcheggio,
motore assicurativo, upload documenti, pagamento Stripe (cauzione + noleggio
in un'unica PaymentIntent a cattura manuale), card "Come raggiungerci" con
geolocalizzazione browser e link Google Maps.

**Back-office Desk** (`/desk/*`, ruoli operativi):

- `/desk` - feed arrivi/partenze, check-in/check-out
- `/desk/contratti` - contratti di noleggio, generazione PDF contratto
  legale con franchigie configurabili, firma digitale (OTP / link / QR),
  invio via WhatsApp (`wa.me`), SMS (`sms:`), email; pannello pagamenti
  (contanti/POS/bonifico/altro/SumUp) e check-in/checkout su ogni contratto
- `/desk/contratti/nuovo` - **contratto walk-in**: crea/cerca cliente,
  seleziona un veicolo specifico disponibile (non "o simile"), assicurazione
  ed extra, senza passare dal wizard pubblico
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
- `/desk/assistente` - **Assistente AI** (sola lettura: ricerca clienti,
  veicoli, contratti, statistiche flotta, notifiche)

**Governance Admin** (`/admin/*`, ruoli di direzione):

- `/admin` - dashboard KPI + Dashboard Flotta Live (stato flotta in tempo
  reale, registro noleggi in corso)
- `/admin/flotta` - anagrafica veicoli compatta (no immagini), catalogo
  globale marche/modelli con ricerca, lookup targa, assicurazioni,
  proprieta'/acquisto, uscita flotta, colori di scadenza compliance
  (bollo/revisione/assicurazione)
- `/admin/pricing`, `/admin/parcheggio`, `/admin/utenti`,
  `/admin/impostazioni` (indirizzo con Google Places autocomplete), `/admin/report`
- `/admin/commercialista` - **Commercialista Virtuale**: entrate/uscite/IVA/
  saldo netto calcolati in modo deterministico dai dati reali, anomalie
  rule-based, sintesi opzionale via AI (mai la fonte dei numeri)

**Sicurezza account** (`/account/sicurezza`, ogni utente autenticato) -
attivazione/disattivazione 2FA (TOTP), codici di backup monouso.

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
npm install                 # `prisma generate` gira dentro `dev`/`build`, non più in postinstall
cp .env.example .env        # valorizza DATABASE_URL e AUTH_SECRET
npm run db:migrate          # applica le migration Prisma
npm run db:seed             # crea tenant demo, utenti, flotta, tariffe
npm run db:seed-catalog     # popola il catalogo globale marche/modelli (idempotente)
npm run dev                 # http://localhost:3000
```

### Credenziali demo (create da `npm run db:seed`)

Tenant demo: **Fabri Rent Campania**. Nessun account demo ha 2FA attiva
di default (attivabile da `/account/sicurezza`).

| Ruolo | Email | Password |
| --- | --- | --- |
| Admin | `admin@fabrirent.it` | `FabriAdmin!2026` |
| Operatore Desk | `desk@fabrirent.it` | `FabriDesk!2026` |
| Officina | `officina@fabrirent.it` | `FabriOfficina!2026` |
| Contabilita' | `contabilita@fabrirent.it` | `FabriConta!2026` |

## Deploy

Vedi [DEPLOYMENT.md](./DEPLOYMENT.md) per la guida completa (Docker,
deploy diretto, migrazioni, rollback, scalabilita'). In breve:

```bash
cp .env.example .env && # valorizza almeno AUTH_SECRET (openssl rand -base64 32)
docker compose build
docker compose up -d db
docker compose run --rm app npx prisma migrate deploy
docker compose up -d
curl http://localhost:3000/api/health
```

## Integrazioni esterne

Vedi [INTEGRATIONS.md](./INTEGRATIONS.md) per lo stato dettagliato di
ognuna (Stripe, SumUp, Google Maps, geolocalizzazione, Assistente AI,
OTP SMS, email, OCR/AI Vision, fatturazione elettronica SDI, lookup
targa). Filosofia comune: interfaccia e livello di servizio sempre
completi; senza credenziale, un esito onesto "non configurato" - mai un
finto successo, mai dati inventati.

## Sicurezza

Vedi [SECURITY.md](./SECURITY.md) per il dettaglio completo. In sintesi:
2FA TOTP + lockout brute-force sul login, RBAC verificato su ogni server
action, rate limiting su ogni endpoint sensibile/costoso, validazione
magic-byte sugli upload, header di sicurezza (CSP/HSTS/ecc.), segreti
mai hardcoded, audit trail su ogni scrittura sensibile e sulle letture
Blacklist.

## Test

Vedi [TESTING.md](./TESTING.md). In breve:

```bash
npm run test               # unit (Vitest)
npm run test:integration   # integration (richiede DATABASE_URL)
npm run test:e2e           # E2E (Playwright)
npx tsc --noEmit && npm run lint && npm run build
```

## Cosa NON e' stato implementato

Elenco onesto, aggiornato dopo il programma di lavoro produzione-ready
(vedi [FINAL_IMPLEMENTATION_REPORT.md](./FINAL_IMPLEMENTATION_REPORT.md)
per il dettaglio completo):

- Tracciamento GPS live via hardware sui veicoli (nessun provider di
  telematica scelto - la geolocalizzazione browser sul sito pubblico e'
  invece reale e implementata)
- Pubblicazione effettiva sugli store iOS/Android (la shell nativa
  Capacitor esiste - vedi [MOBILE.md](./MOBILE.md) - ma servono account
  sviluppatore reali, certificati di firma e una build su macchine con
  Xcode/Android SDK)
- Suite di test per Officina/Danni/Sinistri/Multe/Blacklist/Documenti/
  Cassa (verificati manualmente durante lo sviluppo, non con test
  automatici committati - vedi TESTING.md)
- Test automatizzati per le chiamate reali a Stripe/SumUp (nessuna
  credenziale sandbox disponibile in questa sessione)
- 2FA per l'assistente AI o l'accesso M2M (l'assistente e' gia' in sola
  lettura per design, non serve una conferma aggiuntiva)
- Rate limiting distribuito di default (in-memory finche' `REDIS_URL`
  non e' impostata - vedi SECURITY.md)
- Deploy automatico dopo la CI (la pipeline builda e testa; il deploy
  verso un hosting specifico non e' stato scelto/configurato)

## Comandi utili

```bash
npm run build          # build di produzione
npm run lint            # ESLint
npm run db:studio       # Prisma Studio (browser DB)
npm run db:seed         # ri-esegue il seed (idempotente per email)
npm run db:seed-catalog # ri-esegue il seed del catalogo marche/modelli
npm run cap:sync        # sincronizza la shell nativa Capacitor
```

## Architettura dati

Schema completo in `prisma/schema.prisma`: `Tenant`/`Location`, `User` (con
ruolo, tenant/sede, 2FA), `Vehicle` + `VehicleBrand`/`VehicleModel` (catalogo
globale) + `VehicleInsurancePolicy`, `Booking` (contratti noleggio e
parcheggio), `WorkshopCatalogItem`/`WorkshopIntervention`, `DamageRecord`,
`Claim`, `BlacklistEntry`, `Fine` + `IssuingAuthority`, `Document`,
`Invoice`, `Expense`, `Payment` (Stripe/SumUp/contanti/POS/bonifico),
`Notification`, `AuditLog`, `AiInteractionLog`.

Logica di business in `src/lib/`:

- `session.ts` - RBAC, scoping tenant
- `auth.ts` - autenticazione, lockout, 2FA
- `totp.ts` / `crypto-secret.ts` - 2FA TOTP e cifratura segreti a riposo
- `rate-limit.ts` - rate limiting pluggable (in-memory/Redis)
- `audit.ts` - audit log
- `notifications.ts` - centro notifiche calcolato on-read
- `rental-time.ts` / `pricing-engine.ts` / `insurance*.ts` /
  `fleet-engine.ts` / `parking-engine.ts` - motori di dominio (slot, tariffe
  dinamiche, assicurazione, assegnazione "o simile", capienza parcheggio)
- `stripe.ts` / `sumup.ts` - pagamenti
- `plate-lookup.ts` - lookup targa (provider-based)
- `maps.ts` / `geo.ts` - geocoding, distanza, link direzioni
- `ai-assistant.ts` - Assistente AI (tool layer)
- `commercialista.ts` - Commercialista Virtuale (calcoli deterministici)
- `pdf.ts` - generazione PDF (contratto legale, report/ticket danni,
  fattura, ricorso multa)
- `ocr-provider.ts`, `aruba.ts`, `otp-provider.ts`, `email-provider.ts` -
  integrazioni esterne "stub ma reali" (vedi INTEGRATIONS.md)
- `week.ts` - cassa settimanale
- `compliance.ts` - colori scadenza bollo/revisione/assicurazione
- `logger.ts` - logging strutturato (pino, con redazione segreti)
