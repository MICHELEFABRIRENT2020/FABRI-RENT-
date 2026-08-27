# INTEGRATIONS.md

Ogni integrazione esterna di questo progetto segue la stessa filosofia:
l'interfaccia utente e il livello di servizio sono completi e reali;
senza la credenziale richiesta, la funzione restituisce un esito onesto
"non configurato" (mai un finto successo, mai dati inventati) e la UI
ricade su un percorso manuale quando possibile. Nessuna integrazione
blocca build, avvio o le funzionalita' che non dipendono da essa.

## Reali, verificate contro documentazione ufficiale

### SumUp (`src/lib/sumup.ts`)
OAuth2 client_credentials, Checkouts API (`POST/GET /v0.1/checkouts`).
Endpoint, campi richiesta/risposta e comportamento del webhook verificati
contro developer.sumup.com (non inventati - vedi i commenti in cima al
file per i link esatti). Il webhook di SumUp e' volutamente minimale
({event_type, id}) e la loro stessa documentazione dice di non fidarsi
del payload: il gestore ri-legge sempre il checkout dalla loro API con le
proprie credenziali prima di aggiornare qualunque dato.
ENV: `SUMUP_CLIENT_ID`, `SUMUP_CLIENT_SECRET`, `SUMUP_MERCHANT_CODE`.
Senza: il metodo "SumUp" resta disabilitato nel pannello pagamenti desk
(contanti/POS/bonifico/altro restano pienamente utilizzabili).

### Google Maps (`src/lib/maps.ts`, `src/components/site/address-autocomplete.tsx`)
Geocoding API (server) per convertire l'indirizzo azienda in
lat/lng/Place ID; Places Autocomplete (client, Maps JavaScript API) per
il campo indirizzo. ENV: `GOOGLE_MAPS_API_KEY` (server),
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (client). Senza: il salvataggio
dell'indirizzo funziona comunque (solo senza lat/lng), il campo resta un
input di testo semplice senza suggerimenti.

### Geolocalizzazione browser (`src/lib/hooks/use-geolocation.ts`)
API `navigator.geolocation` nativa del browser, nessuna chiave richiesta.
Lettura singola on-demand (mai tracciamento continuo), usata per mostrare
la distanza dalla sede sulla homepage pubblica.

### Anthropic / AI Assistant (`src/lib/ai-assistant.ts`) + Commercialista Virtuale
SDK ufficiale `@anthropic-ai/sdk`, tool runner
(`client.beta.messages.toolRunner`) con strumenti Zod-tipizzati, tutti in
sola lettura. ENV: `ANTHROPIC_API_KEY`. Senza: l'interfaccia mostra un
messaggio onesto "non configurato"; il livello di calcolo deterministico
della Commercialista Virtuale (`src/lib/commercialista.ts`) funziona
comunque, e' solo la sintesi in linguaggio naturale a richiedere la
chiave.

## Reali ma non verificabili in questa sessione (nessuna credenziale disponibile)

### OTP SMS (`src/lib/otp-provider.ts`)
Generazione/verifica codice reale (CSPRNG via `crypto.randomInt`), invio
non ancora collegato a un provider specifico. ENV:
`SMS_PROVIDER_API_KEY`. Senza: il codice viene loggato (mai in un campo
strutturato redatto - vedi SECURITY.md) invece di essere inviato via SMS.

### Email (`src/lib/email-provider.ts`)
ENV: `EMAIL_PROVIDER_API_KEY`. Senza: le email vengono loggate invece di
spedite.

### AI Vision / OCR documenti (`src/lib/ocr-provider.ts`)
ENV: `AI_VISION_API_KEY`. Senza: lo scanner documenti mostra "OCR non
configurato" e il form ricade sull'inserimento manuale.

### Fatturazione elettronica SDI (`src/lib/aruba.ts`)
XML fattura generato secondo il tracciato, invio allo SDI non ancora
collegato a un provider specifico (Aruba o altro intermediario). ENV:
`ARUBA_SDI_API_KEY`, `ARUBA_SDI_ENDPOINT`. Senza: la fattura resta in
stato "draft" con un errore esplicito invece di un falso "inviata".

## Architettura pronta, nessun vendor scelto (generic adapter, non un'integrazione inventata)

### Lookup targa (`src/lib/plate-lookup.ts`)
Nessuna API pubblica gratuita esiste per il lookup targa->dati veicolo in
Italia (e' un servizio commerciale a pagamento, es. rivenditori dati
ACI/PRA). Non avendo un vendor scelto, l'adattatore implementa un
contratto REST generico documentato da noi stessi (POST {plate} ->
{brand, model, year, fuelType, chassisNumber, category}), con retry,
timeout e gestione 404/429. Per collegare un vendor reale: o il vendor
espone gia' quel contratto, o si scrive un adattatore ponte che lo
traduce. ENV: `PLATE_LOOKUP_API_KEY`, `PLATE_LOOKUP_ENDPOINT`.

## Non implementate (documentate, non fabbricate)

### GPS live hardware (dispositivi di tracciamento sui veicoli)
Il campo `Vehicle.gpsDeviceId` esiste a schema ma nessun provider di
telematica e' collegato: nessun venditore/vendor incaricato in questo
progetto per un dispositivo IoT sui veicoli. ENV riservata (non ancora
letta da alcun codice): `GPS_PROVIDER_API_KEY`. La geolocalizzazione
browser (sopra) e' una funzionalita' diversa e reale, non un sostituto
di questa.

## Perche' non ci sono altre integrazioni "finte"

Nessuna integrazione in questo progetto restituisce mai mai dati
inventati o un successo simulato quando la configurazione manca: ogni
punto di integrazione e' stato progettato per essere onesto sul proprio
stato. Vedi anche `README.md` -> "Cosa NON e' stato implementato" per la
lista di funzionalita' di piu' ampio respiro (non solo integrazioni
esterne) rimaste fuori scope.
