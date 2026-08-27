# DEPLOYMENT.md

## Ambienti

| Ambiente | Come | Note |
| --- | --- | --- |
| Sviluppo | `npm run dev` + Postgres locale | Vedi README "Setup locale" |
| Staging/Produzione | Docker (`Dockerfile` + `docker-compose.yml`) o qualunque host Node 22+ con Postgres 16+ | Nessuna differenza di codice tra staging e produzione: cambiano solo i valori delle variabili d'ambiente |

Non esiste una configurazione "staging" hardcoded nel codice: l'ambiente e'
determinato interamente da `.env` (`NODE_ENV` controllato da Next.js
stesso in build/`npm run start`). Per un vero staging, usa un secondo
deployment (Docker o hosting) con il proprio database e le proprie
credenziali (mai condividere `DATABASE_URL`/`AUTH_SECRET` tra ambienti).

## Passo-passo (Docker)

```bash
git clone <repo> && cd FABRI-RENT-
cp .env.example .env
# valorizza almeno AUTH_SECRET: openssl rand -base64 32

docker compose build
docker compose up -d db
docker compose run --rm app npx prisma migrate deploy
docker compose run --rm app npm run db:seed   # opzionale, dati demo
docker compose up -d
curl http://localhost:3000/api/health          # {"status":"ok","database":"connected",...}
```

## Passo-passo (senza Docker, host Node diretto)

```bash
npm ci
npx prisma migrate deploy
npm run build
node .next/standalone/server.js   # NON `npm run start` in produzione: build "standalone"
```

`next.config.ts` ha `output: "standalone"` - il server prodotto in
`.next/standalone/server.js` e' il modo corretto di avviare l'app in
produzione (piu' leggero, non richiede l'intero `node_modules`). `npm run
start` (`next start`) funziona solo in sviluppo/test locale e stampa un
avviso se usato con l'output standalone.

## Variabili `NEXT_PUBLIC_*` (attenzione: servono al build, non solo al runtime)

Next.js inserisce la variabile `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
direttamente nel bundle client durante `next build` - impostarla solo
nell'`environment:` del container a runtime **non ha alcun effetto**,
perche' il bundle e' gia' stato compilato senza di essa. `docker-compose.yml`
la passa come `build.args` proprio per questo; se costruisci l'immagine a
mano, usa:

```bash
docker build \
  --build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="AIza..." \
  -t fabrigroup-rent-manager .
```

## Variabili d'ambiente richieste

Vedi `.env.example` per l'elenco completo con commenti. Minime per
avviare (l'app funziona, con le integrazioni esterne in modalita'
"non configurato" onesta anziche' fallire):

- `DATABASE_URL`
- `AUTH_SECRET` (anche chiave di cifratura dei segreti 2FA - vedi
  SECURITY.md)
- `NEXTAUTH_URL` (deve combaciare col dominio pubblico reale in
  produzione)

Tutte le altre (SumUp, Google Maps, AI Vision/OCR, Aruba SDI,
lookup targa, Anthropic/AI Assistant, SMS/email) sono opzionali: senza
valore, la relativa funzionalita' degrada onestamente invece di fallire
la build o l'avvio - vedi INTEGRATIONS.md per il dettaglio di ognuna.

## Migrazioni

```bash
npx prisma migrate deploy   # applica le migration pending, non interattivo, sicuro per CI/CD
```

**Mai** `prisma migrate dev` o `prisma migrate reset` in produzione (sono
comandi di sviluppo: il primo puo' chiedere conferma interattiva, il
secondo cancella il database). Le migration in questo repository sono
tutte additive (nuove colonne nullable/con default, nuove tabelle - mai
`DROP COLUMN`/`DROP TABLE` su dati esistenti): verificato eseguendole in
sequenza su un database vuoto prima di ogni commit di questa sessione
(vedi i messaggi dei commit dello schema). Per una futura modifica che
introduce un vincolo `NOT NULL` su una tabella gia' popolata, usa lo
schema a stadi (colonna nullable -> backfill applicativo -> `NOT NULL`),
mai `prisma migrate reset`.

## Health check e monitoraggio

`GET /api/health` verifica sia il processo che la connessione al
database (`SELECT 1`), non solo che il processo risponda - vedi
`src/app/api/health/route.ts`. Il `Dockerfile` lo usa come
`HEALTHCHECK`; qualunque orchestratore (Kubernetes, ECS, un load
balancer) puo' puntarci direttamente.

## Backup

Non implementato in questo repository (e' responsabilita'
dell'infrastruttura di hosting/del provider Postgres gestito, non
dell'applicazione). Minimo raccomandato: backup automatici giornalieri
di Postgres con retention di almeno 7 giorni, testati periodicamente con
un ripristino reale - la maggior parte dei provider Postgres gestiti
(RDS, Cloud SQL, Supabase, Neon, ecc.) lo offre nativamente.

## Rollback

- **Applicazione**: redeploy dell'immagine/build precedente (nessuno
  stato lato applicazione da ripristinare, l'app e' stateless).
- **Database**: le migration di questo progetto sono additive, quindi un
  rollback applicativo a una versione precedente del codice resta
  compatibile con lo schema piu' recente (le colonne/tabelle nuove
  restano semplicemente inutilizzate). Se una migration futura introduce
  un cambiamento non retrocompatibile, va accompagnata da un piano di
  rollback esplicito nella sua migration - non c'e' un meccanismo di
  rollback automatico di Prisma Migrate in produzione.

## CI/CD

Vedi `.github/workflows/ci.yml` e `TESTING.md`. Nessun GitHub Secret e'
necessario per la CI. Per un deploy automatico dopo la CI (non presente
in questo repository), aggiungere un job che, dopo `build`, esegue il
deploy verso l'hosting scelto (Docker registry + pull, Vercel, Railway,
Fly.io, ecc.) - la scelta dipende dall'infrastruttura di destinazione,
non ancora decisa per questo progetto.

## Scalabilita' orizzontale (piu' istanze)

Se l'app gira su piu' di un'istanza dietro un load balancer, imposta
`REDIS_URL` (vedi `.env.example` e `src/lib/rate-limit.ts`): senza,
il rate limiting e la cache OTP (`src/lib/otp-provider.ts`) sono
in-memory per istanza, quindi il limite effettivo si moltiplica per il
numero di istanze e i codici OTP generati su un'istanza non sono
verificabili su un'altra.
