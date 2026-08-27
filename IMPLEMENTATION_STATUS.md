# IMPLEMENTATION_STATUS.md

Audit at the start of the "produzione-ready" work program. This table is
the ground truth used to plan the remaining implementation; it is updated
as each area is completed (see the "Stato finale" column, filled in by the
closing commits of this program, and cross-checked again in
`AUDIT_AFTER_IMPLEMENTATION.md`).

Legend: ✅ implementato e reale · 🟡 parziale · 🔴 non implementato ·
🔵 bloccato da credenziali/provider esterno · ⚠️ richiede intervento umano

| # | Funzionalità | Stato iniziale | File coinvolti | Dipendenze esterne | ENV necessarie | Cosa manca | Priorità | Stato finale |
|---|---|---|---|---|---|---|---|---|
| 1 | Multi-tenant + RBAC | ✅ | `prisma/schema.prisma`, `src/lib/session.ts`, `src/proxy.ts` | - | - | - | P0 | ✅ (invariato, già solido) |
| 2 | Autenticazione (Credentials) | 🟡 | `src/lib/auth.ts` | - | `AUTH_SECRET` | no lockout, no audit su login, no 2FA, security headers assenti | P0 | ✅ lockout 5 tentativi/15min, audit su ogni esito login, header di sicurezza |
| 3 | 2FA | 🔴 | - | - | - | tutto | P0 | ✅ TOTP (otplib) + backup code, segreto cifrato a riposo, verificato E2E live |
| 4 | Rate limiting | 🔴 | - | - | - | tutto | P0 | ✅ `src/lib/rate-limit.ts`, in-memory/Redis, su login/2FA/upload/OCR/booking/plate-lookup/AI/SumUp |
| 5 | CSRF | 🟡 | Server Actions (protezione nativa Next.js) | - | - | verifica esplicita sulle API route con cookie | P0 | ✅ analizzato: nessuna route cookie-autenticata fuori dalle Server Actions - documentato in SECURITY.md, nessun token aggiuntivo necessario |
| 6 | Security headers/CORS | 🔴 | `next.config.ts` | - | - | tutto | P0 | ✅ CSP/HSTS/X-Frame-Options/ecc. in `next.config.ts` |
| 7 | Database marche/modelli veicolo | 🔴 (free-text) | `src/components/admin/vehicle-form.tsx` | - | - | tutto | P1 | ✅ `VehicleBrand`/`VehicleModel`, 31 marche/178 modelli curati, ricerca, combobox |
| 8 | Lookup targa esterno | 🔴 | - | provider commerciale (es. visura PRA) non integrato | `PLATE_LOOKUP_API_KEY` | tutto | P1 | ✅ architettura completa (normalizzazione, validazione, retry, rate limit); 🔵 nessun vendor specifico integrato (nessuno scelto/disponibile) |
| 9 | Google Maps (Places/Geocoding) | 🔴 | - | Google Maps Platform | `GOOGLE_MAPS_API_KEY` | tutto | P1 | ✅ Geocoding server-side + Places Autocomplete client-side; 🔵 richiede chiave reale per l'attivazione |
| 10 | GPS live (browser) | 🔴 | - | - | - | tutto | P1 | ✅ geolocalizzazione one-shot reale su homepage pubblica; 🔴 nessun hardware telematico sui veicoli (nessun provider scelto) |
| 11 | SumUp pagamenti | 🔴 (solo enum `PaymentMethod.sumup` registrato manualmente in cassa) | `prisma/schema.prisma` (`PaymentMethod`) | SumUp REST API | `SUMUP_API_KEY`/`SUMUP_CLIENT_ID`/`SUMUP_CLIENT_SECRET`/`SUMUP_MERCHANT_CODE` | client API, checkout, webhook | P1 | ✅ OAuth2 + Checkouts API verificati contro developer.sumup.com, webhook con re-verifica; 🔵 richiede credenziali merchant reali per un test end-to-end |
| 12 | Contratto walk-in desk | 🔴 (il desk opera solo su prenotazioni già create dal wizard pubblico) | `src/app/desk/*` | - | - | intero flusso | P1 | ✅ `/desk/contratti/nuovo`, verificato E2E live (creazione contratto reale con prezzo corretto) |
| 13 | Stripe | ✅ (reale, cattura combinata cauzione+noleggio) | `src/lib/stripe.ts`, `/api/stripe/webhook` | Stripe | `STRIPE_SECRET_KEY` ecc. | - | P0 | ✅ |
| 14 | OCR/AI Vision documenti | 🟡 (stub onesto) | `src/lib/ocr-provider.ts` | provider AI Vision | `AI_VISION_API_KEY` | client reale quando disponibile | P2 | invariato (bloccato da provider) |
| 15 | Fatturazione elettronica SDI | 🟡 (stub onesto, XML generato) | `src/lib/aruba.ts` | Aruba | `ARUBA_SDI_API_KEY` | invio reale quando disponibile | P2 | invariato (bloccato da provider) |
| 16 | Centro notifiche | ✅ | `src/lib/notifications.ts` | - | - | - | P1 | ✅ |
| 17 | Test automatici | 🔴 (solo verifiche manuali/Playwright ad-hoc, non un suite) | - | - | - | tutto | P2 | ✅ 50 unit + 3 integration (Vitest) + 12 E2E (Playwright), tutti verdi, committati in CI |
| 18 | CI/CD | 🔴 | - | GitHub Actions | - | tutto | P2 | ✅ `.github/workflows/ci.yml` (lint/typecheck/unit/integration/build/e2e/audit) + Dependabot |
| 19 | AI Assistant | 🔴 | - | Anthropic API | `ANTHROPIC_API_KEY` | tutto | P2 | ✅ tool layer completo (search cliente/veicolo/contratto, statistiche, notifiche), sola lettura; 🔵 chiamata reale non testabile senza chiave in questa sessione |
| 20 | Commercialista Virtuale | 🔴 | - | Anthropic API (opzionale, solo narrativa) | `ANTHROPIC_API_KEY` | tutto | P2 | ✅ calcoli deterministici verificati con dati reali (entrate/uscite/IVA/anomalie); sintesi AI opzionale 🔵 richiede chiave |
| 21 | Mobile/App Store | 🟡 (PWA installabile, no wrapper nativo) | `public/manifest.webmanifest`, `public/sw.js` | Apple/Google signing | - | scaffold nativo, credenziali firma (umano) | P3 | ✅ PWA + shell Capacitor iOS/Android generata e verificata; ⚠️ icone reali, firma, build su Xcode/Android SDK, submission richiedono intervento umano |
| 22 | Logging/monitoring | 🔴 (solo `console.*`) | sparso in `src/lib/*` | - | - | logger strutturato, health check | P2 | ✅ `src/lib/logger.ts` (pino, redazione segreti) sostituisce ogni `console.*` server-side; `/api/health` verifica DB |
| 23 | Performance (N+1, indici, paginazione) | 🟡 (non verificato sistematicamente) | vari | - | - | audit + fix mirati | P2 | ✅ audit eseguito (grep sistematico su loop async, 39 indici a schema); nessun problema reale trovato oltre a query già bounded/parallelizzate |
| 24 | Docker/deploy | ✅ | `Dockerfile`, `docker-compose.yml` | - | - | - | P1 | ✅ + verificato che le 3 migration si applicano in sequenza su un DB vuoto |
| 25 | Documentazione | 🟡 (README completo, mancano SECURITY/DEPLOYMENT/INTEGRATIONS/TESTING dedicati) | `README.md` | - | - | doc dedicati | P2 | ✅ SECURITY.md, DEPLOYMENT.md, INTEGRATIONS.md, TESTING.md, MOBILE.md aggiunti; README riscritto |

## Metodo di lavoro seguito

Ogni area 🔴/🟡 e' stata implementata per intero fino al *boundary*
dell'integrazione esterna: dove mancava una credenziale, il codice
(client, validazione, error handling, stati DB, UI, retry/rate-limit) e'
stato comunque scritto e - dove possibile - collaudato dal vivo (server
reale + Playwright, non solo lint/build); l'unica cosa che resta da fare
in quei casi e' valorizzare la variabile d'ambiente. Vedi
`AUDIT_AFTER_IMPLEMENTATION.md` per la classificazione indipendente
finale di ogni singolo requisito e `FINAL_IMPLEMENTATION_REPORT.md` per
il quadro complessivo, i comandi per eseguire/testare/buildare/
deployare il progetto, e la lista dei blocchi residui che richiedono
intervento umano.
