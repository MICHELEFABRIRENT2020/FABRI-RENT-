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
| 2 | Autenticazione (Credentials) | 🟡 | `src/lib/auth.ts` | - | `AUTH_SECRET` | no lockout, no audit su login, no 2FA, security headers assenti | P0 | vedi audit finale |
| 3 | 2FA | 🔴 | - | - | - | tutto | P0 | vedi audit finale |
| 4 | Rate limiting | 🔴 | - | - | - | tutto | P0 | vedi audit finale |
| 5 | CSRF | 🟡 | Server Actions (protezione nativa Next.js) | - | - | verifica esplicita sulle API route con cookie | P0 | vedi audit finale |
| 6 | Security headers/CORS | 🔴 | `next.config.ts` | - | - | tutto | P0 | vedi audit finale |
| 7 | Database marche/modelli veicolo | 🔴 (free-text) | `src/components/admin/vehicle-form.tsx` | - | - | tutto | P1 | vedi audit finale |
| 8 | Lookup targa esterno | 🔴 | - | provider commerciale (es. visura PRA) non integrato | `PLATE_LOOKUP_API_KEY` | tutto | P1 | vedi audit finale |
| 9 | Google Maps (Places/Geocoding) | 🔴 | - | Google Maps Platform | `GOOGLE_MAPS_API_KEY` | tutto | P1 | vedi audit finale |
| 10 | GPS live (browser) | 🔴 | - | - | - | tutto | P1 | vedi audit finale |
| 11 | SumUp pagamenti | 🔴 (solo enum `PaymentMethod.sumup` registrato manualmente in cassa) | `prisma/schema.prisma` (`PaymentMethod`) | SumUp REST API | `SUMUP_API_KEY`/`SUMUP_CLIENT_ID`/`SUMUP_CLIENT_SECRET`/`SUMUP_MERCHANT_CODE` | client API, checkout, webhook | P1 | vedi audit finale |
| 12 | Contratto walk-in desk | 🔴 (il desk opera solo su prenotazioni già create dal wizard pubblico) | `src/app/desk/*` | - | - | intero flusso | P1 | vedi audit finale |
| 13 | Stripe | ✅ (reale, cattura combinata cauzione+noleggio) | `src/lib/stripe.ts`, `/api/stripe/webhook` | Stripe | `STRIPE_SECRET_KEY` ecc. | - | P0 | ✅ |
| 14 | OCR/AI Vision documenti | 🟡 (stub onesto) | `src/lib/ocr-provider.ts` | provider AI Vision | `AI_VISION_API_KEY` | client reale quando disponibile | P2 | invariato (bloccato da provider) |
| 15 | Fatturazione elettronica SDI | 🟡 (stub onesto, XML generato) | `src/lib/aruba.ts` | Aruba | `ARUBA_SDI_API_KEY` | invio reale quando disponibile | P2 | invariato (bloccato da provider) |
| 16 | Centro notifiche | ✅ | `src/lib/notifications.ts` | - | - | - | P1 | ✅ |
| 17 | Test automatici | 🔴 (solo verifiche manuali/Playwright ad-hoc, non un suite) | - | - | - | tutto | P2 | vedi audit finale |
| 18 | CI/CD | 🔴 | - | GitHub Actions | - | tutto | P2 | vedi audit finale |
| 19 | AI Assistant | 🔴 | - | Anthropic API | `ANTHROPIC_API_KEY` | tutto | P2 | vedi audit finale |
| 20 | Commercialista Virtuale | 🔴 | - | Anthropic API (opzionale, solo narrativa) | `ANTHROPIC_API_KEY` | tutto | P2 | vedi audit finale |
| 21 | Mobile/App Store | 🟡 (PWA installabile, no wrapper nativo) | `public/manifest.webmanifest`, `public/sw.js` | Apple/Google signing | - | scaffold nativo, credenziali firma (umano) | P3 | vedi audit finale |
| 22 | Logging/monitoring | 🔴 (solo `console.*`) | sparso in `src/lib/*` | - | - | logger strutturato, health check | P2 | vedi audit finale |
| 23 | Performance (N+1, indici, paginazione) | 🟡 (non verificato sistematicamente) | vari | - | - | audit + fix mirati | P2 | vedi audit finale |
| 24 | Docker/deploy | ✅ | `Dockerfile`, `docker-compose.yml` | - | - | - | P1 | ✅ |
| 25 | Documentazione | 🟡 (README completo, mancano SECURITY/DEPLOYMENT/INTEGRATIONS/TESTING dedicati) | `README.md` | - | - | doc dedicati | P2 | vedi audit finale |

## Metodo di lavoro per il resto del programma

Ogni area 🔴/🟡 sopra viene implementata per intero fino al *boundary*
dell'integrazione esterna: se manca una credenziale, il codice (client,
validazione, error handling, stati DB, UI, retry/rate-limit) viene comunque
scritto e collaudato con mock controllati nei test; l'unica cosa che resta
da fare è valorizzare la variabile d'ambiente. Questo file e
`AUDIT_AFTER_IMPLEMENTATION.md` vengono aggiornati man mano; il quadro
definitivo è in `FINAL_IMPLEMENTATION_REPORT.md`.
