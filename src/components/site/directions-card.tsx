"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Navigation } from "lucide-react";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import { haversineDistanceKm, googleMapsDirectionsUrl } from "@/lib/geo";

/**
 * "Come raggiungerci" (section 4): a single on-demand geolocation read to
 * show the customer their distance from the rental office, plus a
 * directions link. Works with zero API key (the Maps directions link is a
 * plain URL); the distance figure needs the office's geocoded
 * lat/lng (Tenant.latitude/longitude, populated by src/lib/maps.ts when
 * GOOGLE_MAPS_API_KEY is configured) - without it we still show the
 * address and a "search on Maps" link.
 */
export function DirectionsCard({
  address,
  officeCoordinates,
}: {
  address: string;
  officeCoordinates: { latitude: number; longitude: number } | null;
}) {
  const { state, getPosition } = useGeolocation();

  const directionsUrl = officeCoordinates ? googleMapsDirectionsUrl(officeCoordinates) : googleMapsDirectionsUrl(address);

  const distanceKm =
    state.status === "success" && officeCoordinates
      ? haversineDistanceKm({ latitude: state.latitude, longitude: state.longitude }, officeCoordinates)
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="size-4" /> Come raggiungerci
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{address}</p>

        {distanceKm !== null && <p className="text-sm font-medium">Sei a circa {distanceKm.toFixed(1)} km di distanza.</p>}
        {state.status === "denied" && <p className="text-xs text-muted-foreground">Permesso di geolocalizzazione negato.</p>}
        {state.status === "unavailable" && <p className="text-xs text-muted-foreground">{state.reason}</p>}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={getPosition} disabled={state.status === "loading"}>
            <Navigation className="size-3.5" />
            {state.status === "loading" ? "Rilevo posizione..." : "Calcola distanza dalla mia posizione"}
          </Button>
          <Button asChild variant="secondary" size="sm">
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
              Indicazioni stradali
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
