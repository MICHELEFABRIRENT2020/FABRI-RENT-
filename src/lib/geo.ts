/** Great-circle distance between two coordinates, in kilometers (Haversine formula). */
export function haversineDistanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const EARTH_RADIUS_KM = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function googleMapsDirectionsUrl(destination: { latitude: number; longitude: number } | string): string {
  const dest = typeof destination === "string" ? destination : `${destination.latitude},${destination.longitude}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
}
