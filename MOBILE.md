# MOBILE.md

## Cosa c'e' oggi

1. **PWA installabile** (sessione precedente): `public/manifest.webmanifest`
   + `public/sw.js`, registrato in `src/app/layout.tsx`. Funziona su
   iOS/Android/desktop da browser, senza passare da uno store. E'
   l'opzione gia' pronta per l'uso reale oggi.
2. **Shell nativa Capacitor** (questa sessione): `capacitor.config.ts` +
   `android/` + `ios/` (progetti nativi generati con `npx cap add
   android` / `npx cap add ios`, verificato che la generazione completa
   con successo in questo ambiente). Configurato in modalita' "hosted":
   la WebView nativa carica direttamente l'URL di produzione invece di
   impacchettare una build statica - la scelta corretta per un'app
   Next.js server-rendered come questa (non un sito statico esportabile).

## Perche' "hosted" e non "bundled"

Un'app Capacitor tipica impacchetta una build statica (`webDir`) dentro
il pacchetto nativo. Questo progetto e' un'app Next.js con Server Actions,
API route, autenticazione server-side e un database - non puo' essere
esportata come sito statico. La modalita' hosted (`server.url` in
`capacitor.config.ts`) fa caricare alla WebView nativa l'app reale in
esecuzione sul server, esattamente come un browser: e' il pattern
supportato e documentato da Capacitor per questo caso, non un workaround.

Effetto pratico: l'app installata richiede connessione di rete (nessun
funzionamento offline nativo aggiuntivo rispetto a quanto gia' offre il
service worker della PWA) e punta a un URL di produzione configurato in
build (`CAPACITOR_SERVER_URL`), non a `localhost`.

## Come generare/aggiornare le piattaforme native

```bash
npm run cap:sync                 # sincronizza config/plugin dopo una modifica
CAPACITOR_SERVER_URL=https://app.fabrigrouprent.it npx cap sync  # punta a produzione
npm run cap:android              # apre il progetto in Android Studio
npm run cap:ios                  # apre il progetto in Xcode (solo su macOS)
```

## Cosa NON e' stato fatto (blocchi reali, non aggirabili senza credenziali)

- **Icone e splash screen nativi**: `android/`/`ios/` contengono ancora le
  icone segnaposto generate da Capacitor. Vanno rigenerate dal logo reale
  (gia' disponibile in `public/icons/`) con `@capacitor/assets` prima di
  qualunque submission.
- **Firma app / certificati**: nessuna chiave di firma Android
  (`keystore`) ne' certificato di distribuzione Apple e' stata ne' puo'
  essere generata qui - richiedono un account sviluppatore reale
  (Google Play Console, Apple Developer Program) e credenziali che questa
  sessione non ha e non deve inventare.
- **Build eseguibile**: generare un `.apk`/`.aab` richiede l'Android SDK
  completo; generare un `.ipa` richiede Xcode su macOS. Nessuno dei due e'
  disponibile in questo ambiente (container Linux) - il codice e' pronto,
  la build va eseguita su una macchina con questi strumenti.
- **Submission agli store**: schede prodotto, screenshot, privacy policy
  pubblica, revisione Apple/Google - tutti passaggi che richiedono
  decisioni di prodotto e account reali, non implementabili da codice.
- **Deep link / push notification native**: non configurati - valutarli
  solo se l'app nativa deve fare qualcosa che la PWA non puo' gia' fare
  (la shell hosted eredita gia' tutte le funzionalita' web).

## Percorso consigliato

Per il lancio: la PWA (gia' pronta) copre la stragrande maggioranza dei
casi d'uso mobile senza bisogno di store. La shell Capacitor va rifinita
(icone reali, `CAPACITOR_SERVER_URL` di produzione, build su macchine con
gli SDK nativi, credenziali di firma) solo quando/se la presenza sugli
store e' un requisito di business specifico.
