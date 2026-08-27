import { logger } from "@/lib/logger";

/**
 * Google Geocoding (server-side half of section 3). Converts a free-text
 * address into lat/lng + a stable Place ID. Called after
 * `updateTenantProfile` saves a new address; best-effort - a geocoding
 * failure never blocks saving the address itself, it just leaves
 * latitude/longitude unset (see Tenant model comment).
 */
export type GeocodeResult = { latitude: number; longitude: number; placeId: string };

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !address.trim()) return null;

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", address);
    url.searchParams.set("key", apiKey);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      logger.warn({ status: response.status }, "[maps] geocoding request failed");
      return null;
    }

    const json = (await response.json()) as {
      status: string;
      results: { geometry: { location: { lat: number; lng: number } }; place_id: string }[];
    };

    if (json.status !== "OK" || json.results.length === 0) {
      logger.info({ status: json.status }, "[maps] geocoding returned no results");
      return null;
    }

    const result = json.results[0];
    return { latitude: result.geometry.location.lat, longitude: result.geometry.location.lng, placeId: result.place_id };
  } catch (error) {
    logger.error({ err: error }, "[maps] geocoding error");
    return null;
  }
}

export function isMapsConfigured(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY);
}

export function isMapsClientConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
}
