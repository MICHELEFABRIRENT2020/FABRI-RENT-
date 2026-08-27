# SECURITY.md

Stato reale delle protezioni di sicurezza implementate in FabriGroup Rent
Manager, con motivazione tecnica di ogni scelta - non un elenco generico.

## Autenticazione

- NextAuth v5, Credentials provider, sessione JWT, `maxAge: 12h` /
  `updateAge: 1h` (`src/lib/auth.ts`).
- Password hashate con `bcryptjs` (mai in chiaro, mai loggate - vedi
  `src/lib/logger.ts` redazione).
- **Lockout brute-force**: 5 tentativi falliti consecutivi bloccano
  l'account per 15 minuti (`User.failedLoginAttempts`/`lockedUntil`).
  Reset automatico al login riuscito.
- **2FA (TOTP, RFC 6238)**: `src/lib/totp.ts`, via `otplib` (libreria
  matura, non un'implementazione HMAC scritta a mano). Segreto cifrato a
  riposo (AES-256-GCM, chiave derivata da `AUTH_SECRET` via scrypt - vedi
  `src/lib/crypto-secret.ts`). 8 codici di backup monouso, hashati con
  bcrypt. Self-service enrollment/disable in `/account/sicurezza`.
- Ogni esito di login (successo, password errata, account bloccato, 2FA
  fallita) e' scritto su `AuditLog` con IP.
- Cookie di sessione: `SameSite=Lax` (default NextAuth), `Secure`
  automatico quando l'URL e' https (`useSecureCookies`), `HttpOnly`
  sempre. `trustHost: true` e' necessario dietro un reverse proxy/rete
  container (vedi commento in `src/lib/auth.ts`) - va rimosso o ristretto
  se il traffico può raggiungere l'app con un Host header arbitrario
  senza passare da un proxy fidato.

## Autorizzazione (RBAC)

Centralizzata in `src/lib/session.ts`: `requireRole`/`assertRole` per
pagina/azione, `requireTenant`/`assertTenant` per lo scoping multi-tenant.
Ogni server action e ogni route `GET`/`POST` sotto `/api/desk`,
`/api/admin` verifica esplicitamente ruolo *e* tenant prima di leggere o
scrivere - non si fa mai affidamento solo sulla UI per nascondere
un'azione non autorizzata.

## CSRF

**Analisi**: ogni scrittura autenticata in questa app passa da una Next.js
Server Action (`"use server"`), mai da una route `route.ts` che si limita
a fidarsi del cookie di sessione. Le Server Actions di Next.js verificano
nativamente l'header `Origin` contro l'`Host` della richiesta e rifiutano
la chiamata se non combaciano - protezione CSRF di base gia' presente nel
framework, non aggiunta da noi.

Le uniche route `route.ts` che accettano `POST` sono:

| Route | Autenticazione | Nota CSRF |
| --- | --- | --- |
| `/api/bookings` | Nessuna (form pubblico) | Nessun privilegio di sessione da forgiare; mitigato con rate limiting |
| `/api/upload`, `/api/ocr/scan` | Nessuna/opzionale | Idem, piu' validazione magic-byte e rate limiting |
| `/api/stripe/webhook`, `/api/sumup/webhook` | Firma/verifica lato provider, non cookie | CSRF non applicabile (non usa la sessione browser) |

Nessuna route mutante autenticata via cookie esiste al di fuori delle
Server Actions - non serve un token CSRF aggiuntivo (che sarebbe ridondante
con la protezione nativa) ne' e' stato aggiunto, per non introdurre
complessita' senza beneficio reale.

## Rate limiting

`src/lib/rate-limit.ts`: finestra fissa, store in-memory di default
(corretto per una singola istanza Node - vedi `docker-compose.yml`),
Redis via `REDIS_URL` quando l'app gira su piu' istanze. Applicato a:
login, verifica 2FA, lookup targa, ricerca catalogo veicoli, creazione
prenotazione pubblica, upload file, scansione OCR, creazione checkout
SumUp.

## Validazione input e upload

- Zod (`src/lib/validation/booking.ts`) per il payload di prenotazione
  pubblica.
- Upload file: whitelist MIME + **verifica magic-byte** del contenuto
  reale (`src/lib/file-validation.ts`) - il `Content-Type` dichiarato dal
  client non viene mai fidato da solo. Limite dimensione per endpoint.
- Ogni server action valida ruolo/tenant prima di toccare il database;
  Prisma parametrizza automaticamente le query (nessuna concatenazione di
  stringhe SQL in tutto il progetto - protezione SQL injection strutturale,
  non un controllo aggiuntivo).

## Header di sicurezza (`next.config.ts`)

CSP, `Strict-Transport-Security`, `X-Frame-Options: SAMEORIGIN`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`
(geolocalizzazione solo same-origin, camera/microfono disabilitati,
pagamenti solo same-origin). Nessun header CORS esplicito: l'app non deve
essere chiamata da un'origine diversa dalla propria, quindi la politica
same-origin di default del browser resta la protezione corretta - aggiungere
`Access-Control-Allow-Origin: *` sarebbe un indebolimento, non un
miglioramento.

## Segreti

- Nessun segreto hardcoded nel repository (verificato con una ricerca
  sistematica prima di ogni commit di questa sessione).
- Tutte le credenziali passano da variabili d'ambiente, documentate in
  `.env.example` con valori vuoti/placeholder.
- Token OTP e link di firma generati con `crypto.randomInt`/`randomBytes`
  (Node `crypto`, CSPRNG).
- Logging strutturato (`src/lib/logger.ts`, pino) con redazione automatica
  di password/token/secret/apiKey/authorization/cardNumber sui campi
  strutturati. L'unica eccezione deliberata e' il codice OTP nel fallback
  di sviluppo senza provider SMS reale (vedi commento in
  `src/lib/otp-provider.ts`): e' l'unico canale con cui vedere il codice
  in assenza di un provider configurato, quindi resta nel messaggio invece
  che in un campo strutturato redatto.

## Audit trail

`AuditLog` (`src/lib/audit.ts`): chi, cosa, quando, IP, per ogni scrittura
sensibile e per gli eventi di autenticazione. Include anche le *letture*
sensibili (consultazione Blacklist, lookup targa) per compliance GDPR.

## Dipendenze

`npm audit` segnala 8 avvisi (5 moderate, 3 high), tutti in dipendenze
transitive di `prisma`/`exceljs`/`@capacitor/cli` (nessuna sfruttabile
lato server: riguardano `deepmerge-ts`/`uuid`/`valibot`/`xcode`, usati in
percorsi di build/tooling - CLI Prisma, generazione Excel, generazione
progetto Xcode - mai nel runtime che serve richieste utente). Prisma e'
volutamente pinnato su 6.19.3 (stabile) invece della 8.0 RC per non
introdurre instabilita' in un progetto gia' in produzione - da rivalutare
quando esce una versione stabile che risolve l'avviso.

## Cosa NON e' incluso (limiti onesti)

- Nessun WAF/reverse-proxy anti-DDoS: da aggiungere a livello
  infrastrutturale (Cloudflare, AWS WAF, ecc.) davanti al deployment,
  fuori dal perimetro applicativo.
- Nessun secret manager esterno (Vault, AWS Secrets Manager): le
  variabili d'ambiente sono lo standard minimo; un secret manager e' un
  miglioramento da valutare per la produzione.
- Nessun SSO/SAML aziendale: solo Credentials + 2FA TOTP.
