# TESTING.md

## Comandi

```bash
npm run test              # unit (Vitest, no DB, ~3s)
npm run test:watch        # unit, watch mode
npm run test:integration  # integration (Vitest, richiede DATABASE_URL)
npm run test:e2e          # E2E (Playwright, avvia/costruisce l'app da solo)
npx tsc --noEmit          # typecheck
npm run lint               # ESLint
npm run build               # build di produzione
```

## Struttura

- `src/**/*.test.ts` - unit test, nessuna dipendenza esterna (DB mockato o
  assente). Eseguiti da `vitest.config.mts`.
- `src/**/*.integration.test.ts` - toccano il database reale
  (`DATABASE_URL`). Eseguiti separatamente da `vitest.integration.config.mts`
  perche' piu' lenti e perche' CI li fa girare con un servizio Postgres
  dedicato. Ogni test crea le proprie righe throwaway (tenant/utenti/
  prenotazioni con id o email univoci) e le rimuove in `afterAll` - mai
  dipendere dai dati di seed, che possono cambiare.
- `e2e/*.spec.ts` - Playwright, contro un server Next.js reale
  (`playwright.config.ts` builda/avvia l'app in automatico se
  `E2E_BASE_URL` non e' impostata). Login, 2FA, lookup targa, flusso
  walk-in desk.
- `e2e/helpers/*.ts` - fixture di setup/teardown per gli E2E che hanno
  bisogno di scrivere direttamente nel database (es. creare un utente con
  2FA gia' attiva prima del test di login). Eseguiti come processi `tsx`
  separati, non importati nel file di test: il client Prisma generato usa
  `import.meta` e il transform dei file di test di Playwright (orientato a
  CommonJS) non riesce a caricarlo direttamente - `tsx` (lo stesso
  strumento usato da `npm run db:seed`) lo gestisce correttamente.

## Perche' i worker Playwright sono serializzati

`playwright.config.ts` imposta `fullyParallel: false` e `workers: 1`.
Questa suite condivide un solo processo del server di sviluppo e
un'istanza Postgres piccola, senza un database isolato per worker: con
piu' worker in parallelo il pool di connessioni Prisma del server veniva
saturato e richieste non correlate restavano appese oltre il timeout del
test. In CI, con un servizio Postgres dedicato e piu' risorse, si puo'
valutare di riabilitare il parallelismo.

## Cosa NON e' ancora coperto (onestamente)

- Nessun test per i moduli Officina/Danni/Sinistri/Multe/Blacklist/
  Documenti/Cassa (verificati manualmente durante lo sviluppo, mai con un
  test automatico committato).
- Nessun test per l'integrazione Stripe reale (richiede chiavi test/live;
  il flusso di creazione booking pubblico e' verificabile solo fino al
  boundary dell'API Stripe senza credenziali).
- Nessun test per SumUp reale (idem - richiede
  `SUMUP_CLIENT_ID`/`SUMUP_CLIENT_SECRET`/`SUMUP_MERCHANT_CODE` per un
  account sandbox reale; il client HTTP e' testabile solo mockando
  `fetch`, cosa non ancora fatta).
- Nessun test di carico/performance.
- Nessun test di accessibilita' automatizzato (axe-core o simili).

## CI

`.github/workflows/ci.yml`: lint+typecheck, unit test, integration test
(con servizio Postgres dedicato), build, E2E (con servizio Postgres +
seed + Chromium installato al volo), audit dipendenze (informativo, non
bloccante - vedi `SECURITY.md`). Nessun GitHub Secret e' necessario per
far girare la CI: `DATABASE_URL`/`AUTH_SECRET`/`NEXTAUTH_URL` nel workflow
sono valori fittizi validi solo per il servizio Postgres effimero della
pipeline, non credenziali reali. I secret elencati in `.env.example`
(Stripe, SumUp, Google Maps, ecc.) servono solo per il *deploy*, mai per
la CI, perche' ogni integrazione degrada onestamente quando la chiave
manca invece di fallire la build.
