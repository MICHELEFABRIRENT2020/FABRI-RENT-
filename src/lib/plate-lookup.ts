/**
 * Vehicle plate lookup (section 2/Fase 2) - provider-based architecture so
 * a real vendor can be plugged in without touching any caller.
 *
 * There is no vendor contractually chosen for this deployment (Italian
 * plate-to-vehicle-data lookups are a paid commercial service - e.g.
 * resellers built on ACI/PRA data - never a free public API), so this
 * ships a `GenericRestPlateLookupProvider` against a documented-by-us
 * request/response contract (see INTEGRATIONS.md) rather than guessing at
 * a specific vendor's undocumented endpoints. Point `PLATE_LOOKUP_ENDPOINT`
 * at an adapter/serverless function that translates the chosen vendor's
 * real API into this contract, or write a new class implementing
 * `PlateLookupProvider` and swap it in `getPlateLookupProvider()` below -
 * every caller (API route, UI) is unaffected either way.
 */

export type PlateLookupResult = {
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  fuelType: string | null;
  chassisNumber: string | null;
  category: string | null;
};

export type PlateLookupOutcome = { ok: true; data: PlateLookupResult } | { ok: false; reason: string };

export interface PlateLookupProvider {
  lookup(plate: string): Promise<PlateLookupOutcome>;
}

/** Modern Italian plates: 2 letters, 3 digits, 2 letters (e.g. "AB123CD"). Older/special formats (motorcycles, provincial-era plates) are intentionally not accepted here - reject and let the operator fall back to manual entry rather than silently mis-normalizing them. */
const ITALIAN_PLATE_RE = /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/;

export function normalizePlate(raw: string): string {
  return raw.toUpperCase().replace(/[\s-]/g, "");
}

export function isValidItalianPlate(plate: string): boolean {
  return ITALIAN_PLATE_RE.test(normalizePlate(plate));
}

const REQUEST_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;

class NotConfiguredProvider implements PlateLookupProvider {
  async lookup(plate: string): Promise<PlateLookupOutcome> {
    return {
      ok: false,
      reason: `Lookup targa non configurato (PLATE_LOOKUP_API_KEY mancante). Inserisci i dati del veicolo ${plate} manualmente.`,
    };
  }
}

/**
 * Generic adapter: POSTs { plate } with a Bearer token, expects
 * { brand, model, year, fuelType, chassisNumber, category } back (any
 * field may be null/absent). Adjust the mapping below if the real
 * provider's response shape differs - the rest of the app never needs to
 * change since it only sees `PlateLookupResult`.
 */
class GenericRestPlateLookupProvider implements PlateLookupProvider {
  constructor(
    private endpoint: string,
    private apiKey: string
  ) {}

  async lookup(plate: string): Promise<PlateLookupOutcome> {
    let lastError: string = "Errore sconosciuto";

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(this.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
          body: JSON.stringify({ plate }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.status === 429) {
          lastError = "Limite di richieste del provider superato.";
          await sleep(500 * (attempt + 1));
          continue;
        }
        if (response.status === 404) {
          return { ok: false, reason: `Nessun veicolo trovato per la targa ${plate}.` };
        }
        if (!response.ok) {
          lastError = `Il provider ha risposto con errore ${response.status}.`;
          if (response.status >= 500 && attempt < MAX_RETRIES) {
            await sleep(500 * (attempt + 1));
            continue;
          }
          return { ok: false, reason: lastError };
        }

        const json = (await response.json()) as Partial<Omit<PlateLookupResult, "plate">>;
        return {
          ok: true,
          data: {
            plate,
            brand: json.brand ?? null,
            model: json.model ?? null,
            year: typeof json.year === "number" ? json.year : null,
            fuelType: json.fuelType ?? null,
            chassisNumber: json.chassisNumber ?? null,
            category: json.category ?? null,
          },
        };
      } catch (error) {
        clearTimeout(timeout);
        lastError = error instanceof Error && error.name === "AbortError" ? "Timeout del provider di lookup targa." : "Errore di rete verso il provider di lookup targa.";
        if (attempt < MAX_RETRIES) {
          await sleep(500 * (attempt + 1));
          continue;
        }
      }
    }

    return { ok: false, reason: lastError };
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getPlateLookupProvider(): PlateLookupProvider {
  const apiKey = process.env.PLATE_LOOKUP_API_KEY;
  const endpoint = process.env.PLATE_LOOKUP_ENDPOINT;
  if (!apiKey || !endpoint) return new NotConfiguredProvider();
  return new GenericRestPlateLookupProvider(endpoint, apiKey);
}

export async function lookupPlate(rawPlate: string): Promise<PlateLookupOutcome> {
  const plate = normalizePlate(rawPlate);
  if (!isValidItalianPlate(plate)) {
    return { ok: false, reason: `Formato targa non valido: "${rawPlate}". Atteso formato italiano standard (es. AB123CD).` };
  }
  return getPlateLookupProvider().lookup(plate);
}
